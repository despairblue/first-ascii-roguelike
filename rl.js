// font size
var FONT = 32

// map dimensions
var ROWS = 20
var COLS = 30

// number of actors per level, including player
var ACTORS = 2

var PATTERN_LENGTH = 4
var MOVE_TIME = 2
var SPAWN_TIME = 10

// timers
var lastMovement = 0
var lastSpawn = 0

// the structure of the map
var map

// the ascii display, as a 2d array of characters
var gameScreen

// a list of all actors, 0 is the player
var player
var actorList
var livingEnemies

// map tiles
var mapKey = {
	empty: ' ',
	enemy: 'E',
	wall: '#',
	path: '.'
}

// direactios the keys are mapped to
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

var keyCode2Direction = {}
keyCode2Direction[Phaser.Keyboard.LEFT] = directions[0]
keyCode2Direction[Phaser.Keyboard.RIGHT] = directions[1]
keyCode2Direction[Phaser.Keyboard.UP] = directions[2]
keyCode2Direction[Phaser.Keyboard.DOWN] = directions[3]

// initialize phaser, call create() once done
var game = new Phaser.Game(COLS * FONT * 0.6, ROWS * FONT, Phaser.AUTO, null, {
	create: create,
	update: update
})

// points to each actor in its position, for quick searching
var actorMap


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
	draw()
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
			// if (Math.random() > 0.8) {
			if (false) {
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

function createActor(player) {
	// create new actor
	var actor = {
		x: 0,
		y: 0,
		patternIndex: 0,
		pattern: player ? [] : createWalkTree(),
		hp: player ? 3 : 1,
	}
	do {
		// pick a random position that is both a floor and not occupied
		actor.y = randomInt(ROWS)
		actor.x = randomInt(COLS)
	} while (map[actor.y][actor.x] == mapKey.wall || actorMap[actor.y + '_' + actor.x] != null)

	return actor
}

function initActors() {
	// create actors at random locations
	actorList = []
	actorMap = {}
	for (var e = 0; e < ACTORS; e++) {
		actor = createActor(e === 0 ? true : false)

		// add references to the actor to the actors list & map
		actorMap[actor.y + '_' + actor.x] = actor
		actorList.push(actor)
	}

	// the player is the first actor in the list
	player = actorList[0]
	livingEnemies = ACTORS - 1
}

function drawActors() {
	actorList.forEach(function(e, i, l) {
		if (i === 0) {
			// draw current player path
			currentPos = {
				y: e.y,
				x: e.x
			}
			e.pattern.forEach(function(keyCode, i, list) {
				doDraw = false
				switch (keyCode) {
				case Phaser.Keyboard.LEFT:
					currentPos.x += 1
					doDraw = true
					break
				case Phaser.Keyboard.RIGHT:
					currentPos.x -= 1
					doDraw = true
					break
				case Phaser.Keyboard.UP:
					currentPos.y += 1
					doDraw = true
					break
				case Phaser.Keyboard.DOWN:
					currentPos.y -= 1
					doDraw = true
					break
				}
				if (doDraw) {
					gameScreen[currentPos.y][currentPos.x].content = mapKey.path
				}
			})
			// draw player
			gameScreen[e.y][e.x].content = e.hp
		} else {
			// draw enemy
			gameScreen[e.y][e.x].content = mapKey.enemy
		}
	})
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
	var newLocationKey = (actor.y + dir.y) + '_' + (actor.x + dir.x)
	// if the destination tile has an actor in it
	// if (actorMap[newKey] != null && actorMap[newKey] != undefined) {
	if (actorMap[newLocationKey]) {
		//decrement hitpoints of the actor at the destination tile
		var victim = actorMap[newLocationKey]
		victim.hp--

		// if it's dead remove its reference
		if (victim.hp == 0) {
			killActor(victim)
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

function killActor(actor) {
	actorMap[actor.y + '_' + actor.x] = null
	actorList.splice(actorList.indexOf(actor), 1)
	// if (victim != player) {
	// 	livingEnemies--
	// 	if (livingEnemies == 0) {
	// 		// victory message
	// 		var victory = game.add.text(game.world.centerX, game.world.centerY, 'Victory!\nCtrl+r to restart', {
	// 			fill: '#2e2',
	// 			align: 'center'
	// 		})
	// 		victory.anchor.setTo(0.5, 0.5)
	// 	}
	// }
}

function checkPath(player, actor) {
	var partialMatchFound = false

	// iterate over all possible start indices
	actor.pattern.some(function(keyCode, index, list) {
		if (keyCode === player.pattern[0]) {
			if (_checkPath(player, actor, index)) {
				partialMatchFound = true
			}
		}
		return partialMatchFound
	})

	return partialMatchFound
}

function _checkPath(player, actor, startIndex) {
	var count = 0
	var partialMatchFound = true

	startIndex += actor.pattern.length

	player.pattern.every(function(keyCode, index, list) {
		var match = keyCode === actor.pattern[(startIndex - index) % actor.pattern.length]
		// console.debug(keyCode + ' === ' + actor.pattern[(startIndex - index) % actor.pattern.length] + ' = ' + match)
		if (match) {
			count += 1
			if (count >= actor.pattern.length) {
				return false
			}

			return true
		} else {
			partialMatchFound = false
			return false
		}
	})

	return partialMatchFound;
}

// fug: opposite of a bug
//      code that works, that shouldn't work

function matchPath(player, actor) {
	var startIndex = actor.pattern.indexOf(player.pattern[0]) + actor.pattern.length
	var count = 0
	player.pattern.every(function(keyCode, index, list) {
		var match = keyCode === actor.pattern[(startIndex - index) % actor.pattern.length]
		console.debug(keyCode + ' === ' + actor.pattern[(startIndex - index) % actor.pattern.length] + ' = ' + match)
		if (match) {
			count += 1
			if (count >= actor.pattern.length) {
				return false
			}
		}
		return match
	})

	if (count >= actor.pattern.length) {
		return true
	}

	return false
}

function onKeyUp(event) {
	// act on player input
	var acted = false
	switch (event.keyCode) {
	case Phaser.Keyboard.LEFT:
		acted = moveTo(player, {
			x: -1,
			y: 0
		})
		if (acted) {
			player.pattern.unshift(event.keyCode)
		}
		break

	case Phaser.Keyboard.RIGHT:
		acted = moveTo(player, {
			x: 1,
			y: 0
		})
		if (acted) {
			player.pattern.unshift(event.keyCode)
		}
		break

	case Phaser.Keyboard.UP:
		acted = moveTo(player, {
			x: 0,
			y: -1
		})
		if (acted) {
			player.pattern.unshift(event.keyCode)
		}
		break

	case Phaser.Keyboard.DOWN:
		acted = moveTo(player, {
			x: 0,
			y: 1
		})
		if (acted) {
			player.pattern.unshift(event.keyCode)
		}
		break
	}

	if (acted) {
		var partialMatchFound = false

		actorList.forEach(function(actor, index, list) {
			// if not player
			if (index !== 0) {
				// check if player's path matches actor's path
				if (matchPath(player, actor)) {
					console.debug('Match: P:%o, a:%o ', player.pattern, actor.pattern)
					killActor(actor)
					player.pattern = []
					player.hp += 1
				}

				// check if player's path is sub path of actor's
				if (checkPath(player, actor)) {
					partialMatchFound = true
					console.debug('Check: P:%o, a:%o ', player.pattern, actor.pattern)
				}
			}
		})

		// if player's path is no sub path of any actor's path, delete path
		if (!partialMatchFound) {
			player.pattern = []
			player.hp -= 1
		}
	}

	// draw actors in new positions
	draw()
}

// TODO:

function createWalkTree() {
	return [Phaser.Keyboard.RIGHT, Phaser.Keyboard.DOWN, Phaser.Keyboard.LEFT, Phaser.Keyboard.UP]
}

function aiAct(actor) {
	moveTo(actor, keyCode2Direction[actor.pattern[actor.patternIndex % 4]])
	actor.patternIndex += 1
}

function runAI() {
	actorList.forEach(function(enemy, index, actorList) {
		if (index === 0) {
			return
		}
		aiAct(enemy)
	})
}

function draw() {
	drawMap()
	drawActors()
}

function update() {
	if (game.time.elapsedSecondsSince(lastMovement) > 2) {
		lastMovement = game.time.now
		runAI()
		draw()
	}
}
