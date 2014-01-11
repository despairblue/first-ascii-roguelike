// font size
var FONT = 32

// map dimensions
var ROWS = 20
var COLS = 30

// number of actors per level, including player
var ACTORS = 10

// the structure of the map
var map

// the ascii display, as a 2d array of characters
var gameScreen

// a list of all actors, 0 is the player
var player
var actorList
var livingEnemies

var mapKey = {
	empty: ' ',
	enemy: 'E',
	wall: '#'
}

// points to each actor in its position, for quick searching
var actorMap

// initialize phaser, call create() once done
var game = new Phaser.Game(COLS * FONT * 0.6, ROWS * FONT, Phaser.AUTO, null, {
	create: create,
	update: update
})

var lastMovement = 0

function create() {
		// init keyboard commands
		game.input.keyboard.addCallbacks(null, null, onKeyUp)

		// initialize map
		initMap()

		// initialize screen
		gameScreen = []
		for (var y = 0; y < ROWS; y++) {
			var newRow = []
			gameScreen.push(newRow)
			for (var x = 0; x < COLS; x++) {
				newRow.push(initCell('', x, y))
			}
		}

		// initialize actors
		initActors()

		// draw level
		drawMap()
		drawActors()
	}

function initCell(chr, x, y) {
	// add a single cell in a given position to the ascii display
	var style = {
		font: FONT + 'px Nova Mono',
		fill: '#fff'
	}
	return game.add.text(FONT * 0.6 * x, FONT * y, chr, style)
}

function initMap() {
	// create a new random map
	map = []
	for (var y = 0; y < ROWS; y++) {
		var newRow = []
		for (var x = 0; x < COLS; x++) {
			if (Math.random() > 0.8) {
				newRow.push(mapKey.wall)
			} else {
				newRow.push(mapKey.empty)
			}
		}
		map.push(newRow)
	}
}

function drawMap() {
	for (var y = 0; y < ROWS; y++) {
		for (var x = 0; x < COLS; x++) {
			gameScreen[y][x].content = map[y][x]
		}
	}
}

function randomInt(max) {
	return Math.floor(Math.random() * max)
}

function initActors() {
	// create actors at random locations
	actorList = []
	actorMap = {}
	for (var e = 0; e < ACTORS; e++) {
		// create new actor
		var actor = {
			x: 0,
			y: 0,
			pattern: createWalkTree(),
			patternIndex: 0,
			hp: e == 0 ? 3 : 1
		}
		do {
			// pick a random position that is both a floor and not occupied
			actor.y = randomInt(ROWS)
			actor.x = randomInt(COLS)
		} while (map[actor.y][actor.x] == mapKey.wall || actorMap[actor.y + '_' + actor.x] != null)

		// add references to the actor to the actors list & map
		actorMap[actor.y + '_' + actor.x] = actor
		actorList.push(actor)
	}

	// the player is the first actor in the list
	player = actorList[0]
	livingEnemies = ACTORS - 1
}

function drawActors() {
	for (var a in actorList) {
		if (actorList[a] != null && actorList[a].hp > 0) {
			gameScreen[actorList[a].y][actorList[a].x].content = a == 0 ? '' + player.hp : mapKey.enemy
		}
	}
}

function canGo(actor, dir) {
	return actor.x + dir.x >= 0 && actor.x + dir.x <= COLS - 1 && actor.y + dir.y >= 0 && actor.y + dir.y <= ROWS - 1 && map[actor.y + dir.y][actor.x + dir.x] == mapKey.empty
}

function moveTo(actor, dir) {
	// check if actor can move in the given direction
	if (!canGo(actor, dir)) {
		return false
	}

	// moves actor to the new location
	var newKey = (actor.y + dir.y) + '_' + (actor.x + dir.x)
	// if the destination tile has an actor in it
	// if (actorMap[newKey] != null && actorMap[newKey] != undefined) {
	if (actorMap[newKey]) {
		//decrement hitpoints of the actor at the destination tile
		// debugger
		var victim = actorMap[newKey]
		victim.hp--

		// if it's dead remove its reference
		if (victim.hp == 0) {
			actorMap[newKey] = null
			actorList.splice(actorList.indexOf(victim), 1)
			if (victim != player) {
				livingEnemies--
				if (livingEnemies == 0) {
					// victory message
					var victory = game.add.text(game.world.centerX, game.world.centerY, 'Victory!\nCtrl+r to restart', {
						fill: '#2e2',
						align: 'center'
					})
					victory.anchor.setTo(0.5, 0.5)
				}
			}
		}
	} else {
		// remove reference to the actor's old position
		actorMap[actor.y + '_' + actor.x] = null

		// update position
		actor.y += dir.y
		actor.x += dir.x

		// add reference to the actor's new position
		actorMap[actor.y + '_' + actor.x] = actor
	}
	return true
}

function onKeyUp(event) {
	// draw map to overwrite previous actors positions
	drawMap()

	// act on player input
	var acted = false
	switch (event.keyCode) {
	case Phaser.Keyboard.LEFT:
		acted = moveTo(player, {
			x: -1,
			y: 0
		})
		break

	case Phaser.Keyboard.RIGHT:
		acted = moveTo(player, {
			x: 1,
			y: 0
		})
		break

	case Phaser.Keyboard.UP:
		acted = moveTo(player, {
			x: 0,
			y: -1
		})
		break

	case Phaser.Keyboard.DOWN:
		acted = moveTo(player, {
			x: 0,
			y: 1
		})
		break
	}

	// enemies act every time the player does
	if (acted) {
		for (var enemy in actorList) {
			// skip the player
			if (enemy == 0) {
				continue
			}

			var e = actorList[enemy]
			if (e != null) {
				aiAct(e)
			}
		}
	}

	// draw actors in new positions
	drawActors()
}

// TODO: implement
function createWalkTree() {
	return [
		Phaser.Keyboard.RIGHT,
		Phaser.Keyboard.DOWN,
		Phaser.Keyboard.LEFT,
		Phaser.Keyboard.UP
	]
}

function aiAct(actor) {
	var directions = [{
		x: -1,
		y: 0
	}, {
		x: 1,
		y: 0
	}, {
		x: 0,
		y: -1
	}, {
		x: 0,
		y: 1
	}]
	var directions2 = {}
	directions2[Phaser.Keyboard.LEFT] = directions[0]
	directions2[Phaser.Keyboard.RIGHT] = directions[1]
	directions2[Phaser.Keyboard.UP] = directions[2]
	directions2[Phaser.Keyboard.DOWN] = directions[3]

	moveTo(actor, directions2[actor.pattern[actor.patternIndex % 4]])
	actor.patternIndex += 1
}

function runAI() {
	actorList.forEach(function(enemy, index, actorList) {
		aiAct(enemy)
	})
}

function draw() {
	drawMap()
	drawActors()
}

function update() {
	if (game.time.elapsedSecondsSince(lastMovement) > 2) {
		console.log(game.time.elapsedSecondsSince(lastMovement))
		lastMovement = game.time.now
		runAI()
		draw()
	}
}
