const loader = PIXI.Loader.shared;
const Sprite = PIXI.Sprite;

const PLAYER_YSIZE = 100;
const PLAYER_XSIZE = 5;
const PLAYER_ROUNDED_BORDER = 10;
const MAX_SPEED = 5;
const DAMPING = 0.95;

const BALL_SIZE = 12;
const BALL_SPEED = 5;
const MAX_BALL_SPEED = 20;
const BALL_SPEED_INCREASE = 1.005;

const WIDTH = 800;
const HEIGHT = 600;

const STATS_POS = 10;
const SPEED_TEXT_YPOS = 5;
const STATS_FONT_SIZE = 20;

const LOSE_MESSAGE_FONT_SIZE = 40;
const PLAY_AGAIN_MESSAGE_FONT_SIZE = 20;

const app = new PIXI.Application({
    width: WIDTH,
    height: HEIGHT,
    antialias: true,
    resolution: 1
});

const entities = new Map;
const scenes = new Map;
const sounds = new Map;

let endGame = false;
let tick = 0;

window.onload = function() {
    document.body.appendChild(app.view);
}

loader.load(setup);

function keyboard(value) {
    const key = {};

    key.value = value;

    key.isDown = false;
    key.isUp = true;

    key.press = undefined;
    key.release = undefined;

    key.downHandler = event => {
        if (event.key.toLowerCase() === key.value.toLowerCase()) {
            if (key.isUp && key.press) {
                key.press();
            }

            key.isDown = true;
            key.isUp = false;

            event.preventDefault();
        }
    }
  
    key.upHandler = event => {
        if (event.key.toLowerCase() === key.value.toLowerCase()) {
            if (key.isDown && key.release) {
                key.release();
            }

            key.isDown = false;
            key.isUp = true;

            event.preventDefault();
        }
    }
  
    const downListener = key.downHandler.bind(key);
    const upListener = key.upHandler.bind(key);
    
    window.addEventListener("keydown", downListener, false);
    window.addEventListener("keyup", upListener, false);
    
    key.unsubscribe = () => {
        window.removeEventListener("keydown", downListener);
        window.removeEventListener("keyup", upListener);
    }
    
    return key;
}

function control(entity, velocity) {
    const up = keyboard("w");
    const down = keyboard("s");

    up.press = () => {
        if (!down.isDown) {
            entity.vy = -velocity;
        } else {
            entity.vy = velocity * DAMPING;
        }
    }
    
    up.release = () => {
        if (down.isDown) {
            entity.vy = velocity;
        } else {
            entity.vy = -velocity * DAMPING;
        }
    }

    down.press = () => {
        if (!up.isDown) {
            entity.vy = velocity;
        } else {
            entity.vy = -velocity * DAMPING;
        }
    }

    down.release = () => {
        if (up.isDown) {
            entity.vy = -velocity;
        } else {
            entity.vy = velocity * DAMPING;
        }
    }
}

function increaseBallSpeed() {
    const ball = entities.get("ball");

    if (ball.vx >= MAX_BALL_SPEED) {
        ball.vx = MAX_BALL_SPEED;
        ball.vy = MAX_BALL_SPEED;
    } else {
        ball.vx *= BALL_SPEED_INCREASE;
        ball.vy *= BALL_SPEED_INCREASE;
    }
}

function drawLoseMessage() {
    const loseMessage = new PIXI.Container();

    const message = new PIXI.Text("You lost!", new PIXI.TextStyle ({
        fontSize: LOSE_MESSAGE_FONT_SIZE,
        fill: "white"
    }));

    const message2 = new PIXI.Text("Press X to play again", new PIXI.TextStyle ({
        fontSize: PLAY_AGAIN_MESSAGE_FONT_SIZE,
        fill: "white"
    }));

    message.anchor.set(0.5, 0.5);
    message2.anchor.set(0.5, 0.5);

    message2.y = message.y + message.getBounds().height;

    loseMessage.position.set(app.renderer.view.width / 2, app.renderer.view.height / 2);

    entities.set("loseMessage", loseMessage);

    loseMessage.addChild(message, message2);
    scenes.get("gameScene").addChild(loseMessage);
}

function drawTimeText() {
    const infoBoard = new PIXI.Container();

    const style = new PIXI.TextStyle ({
        fontSize: STATS_FONT_SIZE,
        fill: "white"
    });

    const timeText = new PIXI.Text("00:00", style);

    const speedText = new PIXI.Text("Speed: 0", style);

    timeText.anchor.set(1, 0);
    speedText.anchor.set(1, 0);

    speedText.y = timeText.getBounds().height + SPEED_TEXT_YPOS;

    infoBoard.position.set(app.renderer.view.width - STATS_POS, STATS_POS);

    entities.set("timeText", timeText);
    entities.set("speedText", speedText);

    infoBoard.addChild(timeText);
    infoBoard.addChild(speedText);

    scenes.get("gameScene").addChild(infoBoard);
}

function updateTimeText() {
    const ball = entities.get("ball");
    const speed = Math.abs(ball.vx);

    entities.get("timeText").text = new Date(parseInt(tick * (1000 / 60))).toISOString().slice(11, -5);

    if (speed > 0) {
        entities.get("speedText").text = `Speed: ${(speed - BALL_SPEED + 1).toFixed(1)}x`;
    }
}

function deleteEntity(stage, name) {
    stage.removeChild(entities.get(name));
    entities.delete(name);
}

function addEntity(stage, entity, name) {
    stage.addChild(entity);
    entities.set(name, entity);
}

function loseGame() {
    if (endGame) {
        return;
    }

    endGame = true;

    drawLoseMessage();

    keyboard("x").press = function () {
        this.unsubscribe();

        deleteEntity(scenes.get("gameScene"), "loseMessage");
        startGame();
    }

    sounds.get("lose").play();
}

function startGame() {
    endGame = false;
    tick = 0;

    resetPositions();

    app.ticker.start();
}

function resetPositions() {
    const player = entities.get("player");
    const ball = entities.get("ball");

    player.position.set(50, (app.renderer.view.height / 2) - player.getBounds().height / 2);
    ball.position.set(app.renderer.view.width / 2, app.renderer.view.height / 2);

    player.vx = 0;
    player.vy = 0;

    ball.vx = BALL_SPEED;
    ball.vy = BALL_SPEED;
}

function isTopBorder(posY, speed = 0) {
    return posY - Math.abs(speed) <= 0 ? true : false;
}

function isBottomBorder(posY, speed = 0) {
    return posY + Math.abs(speed) >= app.renderer.view.height ? true : false;
}

function isLeftBorder(posX, speed = 0) {
    return posX - Math.abs(speed) <= 0 ? true : false;
}

function isRightBorder(posX, speed = 0) {
    return posX + Math.abs(speed) >= app.renderer.view.width ? true : false;
}

function ballPlayerHit(player, ball) {
    const x1 = ball.x;
    const x2 = ball.x + ball.vx;

    const bY1 = ball.y + ball.vy;
    const bY2 = bY1 + ball.getBounds().height;

    const pY1 = player.y + player.vy;
    const pY2 = pY1 + player.getBounds().height;

    if (player.x <= x1 && player.x >= x2) {
        if (bY2 >= pY1 && bY1 <= pY2) {
            return true;
        }
    }

    return false
}

function movePlayer(delta) {
    const player = entities.get("player");
    
    if (isTopBorder(player.y) && player.vy < 0) {
        player.vy = 0;
    } else if (isBottomBorder(player.y + player.getBounds().height) && player.vy > 0) {
        player.vy = 0;
    } else if (Math.abs(player.vy) < 0.1) {
        player.vy = 0;
    } else if (Math.abs(player.vy) < MAX_SPEED) {
        player.vy = player.vy * DAMPING;
    } else {
        player.vy = (player.vy < 0 ? -1 : 1) * MAX_SPEED;
    }
    
    player.y += player.vy * delta;
}

function moveBall(delta) {
    const ball = entities.get("ball");
    const player = entities.get("player");

    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    if (isTopBorder(ball.y, ball.vy) || isBottomBorder(ball.y + ball.height, ball.vy)) {
        ball.vy = -ball.vy;

        sounds.get("ball1").play();
    }

    if (isRightBorder(ball.x + ball.width, ball.vx)) {
        ball.vx = -ball.vx;

        sounds.get("ball1").play();
    }

    if (isLeftBorder(ball.x, ball.vx)) {
        loseGame();
    }

    if (ballPlayerHit(player, ball)) {
        ball.vx = -ball.vx;

        sounds.get("ball1").play();
    }
}

function setup (loader, resources) {
    /** SCENES */

    const gameScene = new PIXI.Container();
    const startScene = new PIXI.Container();

    const player = new PIXI.Graphics();
    const ball = new PIXI.Graphics();

    gameScene.visible = false;

    scenes.set("startScene", startScene);
    scenes.set("gameScene", gameScene);

    app.stage.addChild(startScene, gameScene);

    /** ADD PLAYER */

    player.beginFill(0xFFFFFF);
    player.drawRoundedRect(0, 0, PLAYER_XSIZE, PLAYER_YSIZE, PLAYER_ROUNDED_BORDER);
    player.endFill();

    player.position.set(50, (app.renderer.view.height / 2) - player.getBounds().height / 2);

    player.vx = 0;
    player.vy = 0;

    addEntity(gameScene, player, "player");

    /** ADD BALL */

    ball.beginFill(0xFFFFFF);
    ball.drawCircle(BALL_SIZE, BALL_SIZE, BALL_SIZE)
    ball.endFill();

    ball.position.set(app.renderer.view.width / 2, app.renderer.view.height / 2);

    addEntity(gameScene, ball, "ball");

    /** ADD START TEXT */

    const startText = new PIXI.Text("Press X to start", new PIXI.TextStyle ({
        fontSize: 20,
        fill: "white"
    }));

    startText.anchor.set(0.5, 0.5);
    startText.position.set(app.renderer.view.width / 2, app.renderer.view.height / 2);

    addEntity(startScene, startText, "startText");

    /** SOUNDS */

    sounds.set("ball1", new Audio("sounds/ball1.wav"));
    sounds.set("lose", new Audio("sounds/lose.wav"));

    /** START GAME */

    state = play;

    keyboard("x").press = function () {
        this.unsubscribe();

        startScene.visible = false;
        gameScene.visible = true;

        control(player, MAX_SPEED);
        drawTimeText();

        app.ticker.add(delta => update(delta));

        startGame();
    }
}

function update(delta){
    tick++;

    if (endGame) {
        app.ticker.stop();
    }

    state(delta);
}

function play(delta) {    
    movePlayer(delta);
    moveBall(delta);

    if (tick % 60 === 0 && scenes.get("gameScene").visible) {
        increaseBallSpeed();
    }

    updateTimeText();
}