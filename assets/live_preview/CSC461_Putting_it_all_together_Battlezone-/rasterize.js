/****************************************************************************************************
 * GLOBAL VARIABLES AND CONSTANTS
 ****************************************************************************************************/

/* Default camera values */
var defaultEye = vec3.fromValues(0.5, 0.5, -0.5);
var defaultCenter = vec3.fromValues(0.5, 0.5, 0.5);
var defaultUp = vec3.fromValues(0, 1, 0);
var Eye = vec3.clone(defaultEye);
var Center = vec3.clone(defaultCenter);
var Up = vec3.clone(defaultUp);
var cameraOffsetBack = 0.4; //for 3d, how far back is camera
var cameraHeight = 0.25; //for 3d, how high is the camera

/* Lighting configuration */
var lightAmbient = vec3.fromValues(1.3, 1.3, 1.3);
var lightDiffuse = vec3.fromValues(1.2, 1.2, 1.2);
var lightSpecular = vec3.fromValues(0.4, 0.4, 0.4);
var lightPosition = vec3.fromValues(-0.5, 1.5, -0.5);
var rotateTheta = Math.PI / 50; //for the rotations

/* WebGL context and geometry data */
var gl = null;
var inputTriangles = [];
var numTriangleSets = 0;
var vertexBuffers = [];
var normalBuffers = [];
var triSetSizes = [];
var triangleBuffers = [];
var textureBuffers = [];
var modelTextures = [];
var textureCache = {};
var viewDelta = 0.05;

/* HUD canvas for 2D overlay*/
var imageCanvas = null;
var imageContext = null;

/* Shader uniform and attribute locations */
var vPosAttribLoc;
var vNormAttribLoc;
var texCoordAttribLoc;
var mMatrixULoc;
var pvmMatrixULoc;
var ambientULoc;
var diffuseULoc;
var specularULoc;
var shininessULoc;
var useLightingULoc;
var blendModeULoc;
var alphaULoc;
var uKeyEnableULoc;
var uKeyColorULoc;
var uKeyThreshULoc;
var eyePositionULoc;
var lightAmbientULoc;
var lightDiffuseULoc;
var lightSpecularULoc;
var lightPositionULoc;
var samplerULoc;
var gUseLighting = 1;
var gBlendMode = 1;

/* HUD and UI textures */
var hudTexture = null;
var radarTexture = null;

/* Battlefield and ground */
var battlefield = null;
var groundTexture = null;
var blueGroundTexture = null;
var neonGroundTexture = null;
var groundTextureLoaded = false;
var tileScaleULoc = null;

/* Player tank state */
var playerTankModel = null;
var playerPos = vec3.fromValues(0.5, 0.0, 0.3);
var playerRadius = 0.08;
var playerHeading = 0.0;
var playerAlive = true;
var playerRespawnTimer = 0;
var playerInvulnTimer = 0; //for respawn
var playerAbilityInvulnTimer = 0; //for upgrade

/* Enemy tank state */
var enemyTankModel = null;
var enemyPos = vec3.fromValues(0.2, 0.0, 0.8);
var enemyRadius = 0.08;
var enemyAlive = true;
var enemyMinDist = 0.6;
var enemySpeed = 0.25;
var enemyState = "wander";
var enemyWanderTimer = 0;
var enemyChaseDelay = 4.0;
var enemyRespawnTimer = 0;
var enemyShootCooldown = 3.0;

/* Obstacles and environment */
var obstacles = [];
var cubeModel = null;
var pyramidModel = null;
var hemiModel = null;
var blackObstacleTexture = null;

/* Mountains and background */
var mountainModel = null;
var mountainModels = [];
var mountains = [];

/* Projectiles and explosions */
var playerShot = {
	active: false,
	pos: vec3.create(),
	dir: vec3.create(),
	speed: 1.2,
	maxDist: 3.0, //limits how far bullet travels before disappears
	traveled: 0
};
var enemyShot = {
	active: false,
	pos: vec3.create(),
	dir: vec3.create(),
	speed: 1.0,
	maxDist: 3.0,
	traveled: 0
};
var explosions = [];

/* Gameplay and timing */
var keysDown = {};
var gameStarted = false;
var score = 0; //score tracker
var lastFrameTime = 0; //remember when the last frame happened so we can figure how much time passed and update game   

/* Audio system */
var audioContext = null;
var audioReady = false;
var radarBeepTimer = 0;
var RADAR_BEEP_PERIOD = 1.5; //beep every 1.5s

/* 3D crosshair */
var crosshair3DBuffer = null;
var crosshair3DVertexCount = 0;

/* Different game mode activated with ! key */
var isMakeItYourOwnMode = false;
var differentGameModeStage = 0;

/* Detailed tank parts */
var detailedPlayerTankParts = []; //turret, barrel, etc
var detailedEnemyTankParts = [];
var detailedTankBodyHalfHeight = 0.0;


var enemyHeading = 0.0; //the direction the enemy tank is facing

/* Tank textures */
var playerTankTexture = null;
var enemyTankTexture = null;


/* Wave and upgrade mode state */
var currentWave = 1;
var inUpgradeMenu = false;
var enemiesRemainingInWave = 0;
var waveIntroTimer = 0.0;
var hasWonGame = false;
var waveEnemies = [];

/* Player upgrade levels */
var playerShotSpeedLevel = 0;
var playerFireRateLevel = 0;
var playerShotRangeLevel = 0;
var playerMultiShotLevel = 0;
var playerMoveSpeedBase = 0.6;
var playerMoveSpeed = 0.6;
var playerLives = 1;
var playerMaxLives = 1;

/* Player firing cooldown */
var playerFireDelay = 0.6;
var playerFireCooldown = 0.0;

/* Active ability charges */
var abilityInvincibleCharges = 0;
var abilityNukeCharges = 0;
var abilityTeleportCharges = 0;

// Per-wave upgrade options (3 per wave)
var waveUpgradeConfig = [
    {
		title: "Wave 1 Upgrades",
        options: [
            { label: "Increased speed", action: "speed" },
            { label: "Fire more bullets (faster)", action: "multiFire"},
            { label: "Invincible for 10s", action: "invincible10"}
        ]
    },
    {
        title: "Wave 2 Upgrades",
        options: [
            { label: "Bullet is much faster", action: "bulletFast"  },
            { label: "Double life", action: "doubleLife"  },
            { label: "Destroy all in a radius", action: "nukeRadius"  }
        ]
    },
    {
        title: "Wave 3 Upgrades",
        options: [
            { label: "Increased speed", action: "speed" },
            { label: "Teleport to spawn", action: "teleportSpawn" },
            { label: "More bullets", action: "multiFire" }
        ]
    },
    {
        title: "Wave 4 Upgrades",
        options: [
            { label: "Super bullets", action: "bulletFast" },
            { label: "Extra shield time", action: "shield" },
            { label: "Huge radius nuke", action: "nukeRadius" }
        ]
    },
    {
        title: "Wave 5 Upgrades",
        options: [
            { label: "MAX speed", action: "speed" },
            { label: "MAX bullet spam", action: "multiFire" },
            { label: "Invincible victory", action: "invincible10"}
        ]
    }
];

/************* TEXTURES *************/



function isPowerOf2(value) {
	return (value & (value - 1)) === 0;
}

function loadTexture(gl, url) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// BLUE placeholder so we see *something* before the real image loads
	const pixel = new Uint8Array([0, 0, 255, 255]);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		1,
		1,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		pixel
	);

	const image = new Image();

	// For local files served from the same folder, you usually do NOT want crossOrigin
	// when developing. Comment it out for now.
	// image.crossOrigin = "Anonymous";

	image.onload = () => {
		console.log("✅ Texture loaded:", url, image.width + "x" + image.height);

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
	};

	image.onerror = () => {
		console.error("❌ FAILED to load texture:", url);
	};

	image.src = url;
	return texture;
}

//knows it will be over a large plane, 
function loadGroundTexture(gl, url) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var pixel = new Uint8Array([5, 5, 25, 255]);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel
    );

    var image = new Image();

    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );

        // Check for power-of-two
        var pot = isPowerOf2(image.width) && isPowerOf2(image.height);

        if (pot) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        groundTextureLoaded = true;
    };
    image.src = url;
    return texture;
}

function createSolidTexture(gl, r, g, b, a) {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);

	const pixel = new Uint8Array([r, g, b, a]); // 1×1 pixel
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		1,
		1,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		pixel
	);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	return tex;
}


function getOrCreateTexture(gl, filename) {
	const fullUrl = filename;
	if (textureCache[fullUrl]) {
		return textureCache[fullUrl];
	}
	const tex = loadTexture(gl, fullUrl);
	textureCache[fullUrl] = tex;
	return tex;
}

/****************************************************************************************************
 * AUDIO SYSTEM
 ****************************************************************************************************/

function ensureAudioContext() {
	if (!audioContext) {
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
	}
	if (audioContext.state === "suspended") {
		audioContext.resume();
	}
	audioReady = true;
}

//use ChatGPT to create the below function to make th beeping sound for the radar
function playBeep(freq = 880, duration = 0.08, volume = 0.2) {
	if (!audioReady || !audioContext) {
		return;
	}

	var oscillator = audioContext.createOscillator();
	var gainNode = audioContext.createGain();

	oscillator.type = "square";
	oscillator.frequency.value = freq;
	gainNode.gain.value = volume;

	oscillator.connect(gainNode);
	gainNode.connect(audioContext.destination);

	var currentTime = audioContext.currentTime;
	oscillator.start(currentTime);
	oscillator.stop(currentTime + duration);
}


/****************************************************************************************************
 * KEYBOARD INPUT HANDLING
 ****************************************************************************************************/

function keyDownHandler(event) {
	ensureAudioContext();

	// Block browser scrolling and default behavior for game keys - now those keys only work for the game
	var blockKeys = [
		"Space",
		"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
		"KeyP", "Escape",
		"KeyQ", "KeyE", "KeyR"
	];
	if (blockKeys.includes(event.code) || event.key === "!") {
		event.preventDefault(); //don't do default if the keys in the list were pressed
	}

	// Track which physical key is currently pressed
	keysDown[event.code] = true;

	// Switch into different game mode with waves when '!' is pressed
	if (event.key === "!") {
		startDifferentModeAtWave1();
		return;
	}

	// Handle upgrade selection in wave mode when between waves
	if (isMakeItYourOwnMode && inUpgradeMenu) {
		if (event.code === "Digit1") {
			applyUpgradeChoice(1);
		} else if (event.code === "Digit2") {
			applyUpgradeChoice(2);
		} else if (event.code === "Digit3") {
			applyUpgradeChoice(3);
		}
		return;
	}

	// Handle game control keys
	switch (event.code) {
		case "KeyP":
			gameStarted = true;
			break;

		case "Escape":
			resetGame();
			break;

		case "Space":
			firePlayerShot();
			break;

		case "KeyQ":
			//make sure it is defined in the game mode
			if (typeof activateInvincibilityAbility === "function") {
				activateInvincibilityAbility();
			}
			break;

		case "KeyE":
			if (typeof activateNukeAbility === "function") {
				activateNukeAbility();
			}
			break;

		case "KeyR":
			if (typeof activateTeleportAbility === "function") {
				activateTeleportAbility();
			}
			break;

		default:
			break;
	}
}

function keyUpHandler(event) {
	// Block browser default behavior for game keys
	var blockKeys = [
		"Space",
		"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
		"KeyP", "Escape",
		"KeyQ", "KeyE", "KeyR"
	];
	if (blockKeys.includes(event.code) || event.key === "!") {
		event.preventDefault();
	}

	// Mark key as no longer pressed
	keysDown[event.code] = false;
}


/************* WEBGL SETUP *************/
function setupWebGL() {
	// HUD canvas
	imageCanvas = document.getElementById("myImageCanvas");
	imageContext = imageCanvas.getContext("2d");

	var cw = imageCanvas.width;
	var ch = imageCanvas.height;
	imageContext.clearRect(0, 0, cw, ch);

	// 3D canvas
	var canvas = document.getElementById("myWebGLCanvas");
	gl = canvas.getContext("webgl", { alpha: true, antialias: true });
	try {
		if (gl == null) {
			throw "unable to create gl context -- is your browser gl ready?";
		} else {
			gl.clearDepth(1.0);
			gl.enable(gl.DEPTH_TEST);
		}
	} catch (e) {
		console.log(e);
	}

	document.addEventListener("keydown", keyDownHandler);
	document.addEventListener("keyup", keyUpHandler);
	blackObstacleTexture = createSolidTexture(gl, 0, 0, 0, 255);

}




/************* HUD & RADAR TEXTURES *************/
function setupHudTexture() {
    hudTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, hudTexture);
    let pixel = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    radarTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, radarTexture);
    const pinkPixel = new Uint8Array([255, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pinkPixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

/************* HUD (score, prompts, respawn text) *************/
function renderHUD() {
	if (!imageContext) {
		return;
	}
	const w = imageCanvas.width;
	const h = imageCanvas.height;

	// Clear HUD so we can see WebGL scene behind it
	imageContext.clearRect(0, 0, w, h);

	// SCORE
	imageContext.fillStyle = "white";
	imageContext.font = "20px monospace";
	imageContext.fillText("Score: " + score, 15, 35);

	// PART 6:
	// Wave info (only for ! mode)
	if (isMakeItYourOwnMode) {
		imageContext.fillStyle = "cyan";
		imageContext.font = "16px monospace";
		imageContext.fillText("Wave: " + currentWave, 15, 54);

		imageContext.fillStyle = "orange";
		imageContext.fillText("Enemies left: " + enemiesRemainingInWave, 15, 74);

		imageContext.fillStyle = "lime";
		imageContext.fillText("Lives: " + playerLives + "/" + playerMaxLives, 15, 94);

		// abilities
		imageContext.fillStyle = "magenta";
		imageContext.font = "14px monospace";
		imageContext.fillText("Q: Shield x" + abilityInvincibleCharges, 15, 114);
		imageContext.fillText("E: Nuke x" + abilityNukeCharges, 15, 134);
		imageContext.fillText("R: Teleport x" + abilityTeleportCharges, 15, 154);
	}

	// Wave intro banner - made by asking ChatGPT to know how to get it to disappear after certain amount of time
	if (isMakeItYourOwnMode && gameStarted && waveIntroTimer > 0.0) {
		const w = imageCanvas.width;
		const h = imageCanvas.height;

		imageContext.save();
		imageContext.globalAlpha = 0.9;
		const panelWidth = 260;
		const panelHeight = 80;
		const px = (w - panelWidth) / 2;
		const py = h * 0.15;
		imageContext.fillStyle = "rgba(0,0,0,0.9)";
		imageContext.fillRect(px, py, panelWidth, panelHeight);
		imageContext.restore();

		imageContext.fillStyle = "magenta";
		imageContext.font = "32px monospace";
		imageContext.fillText("WAVE " + currentWave, px + 40, py + 50);
	}

	// UPGRADE MENU (between waves in "!" mode)
    if (isMakeItYourOwnMode && inUpgradeMenu) {

		// Draw a dark panel in the middle of the screen to show the upgrade choices
        imageContext.save();
        imageContext.globalAlpha = 0.94; //sightly see through

        const panelWidth = 460;
        const panelHeight = 200;
        const px = (w - panelWidth) / 2;
        const py = (h - panelHeight) / 2;
        imageContext.fillStyle = "rgba(0,0,0,0.95)"; // almost solid black background
        imageContext.fillRect(px, py, panelWidth, panelHeight);
        imageContext.restore();

		// Figure out which upgrade config to use based on the current wave
    	// (clamped so we don't go out of bounds if currentWave is weird)
        const idx = Math.min(
            Math.max(currentWave - 1, 0),
            waveUpgradeConfig.length - 1
        );
        const cfg = waveUpgradeConfig[idx];

        imageContext.fillStyle = "cyan";
        imageContext.font = "20px monospace";
        imageContext.fillText(cfg.title || ("Wave " + currentWave + " Upgrades"),
								px + 20, py + 32);
		
		// Now list out the actual options (1, 2, 3)
        imageContext.fillStyle = "white";
        imageContext.font = "16px monospace";
        let y = py + 64;
        const opts = cfg.options;

        for (let i = 0; i < 3; i++) {
            const opt = opts[i];
            if (opt) {
                imageContext.fillText((i + 1) + ") " + opt.label, px + 20, y);
            } else {
                imageContext.fillText((i + 1) + ") [unused]", px + 20, y);
            }
            y += 24;
        }

        imageContext.fillStyle = "yellow";
        imageContext.fillText("Press 1, 2, or 3...", px + 20, py + panelHeight - 24);

		// don't draw the normal 'Press P' menu on top
        return; 
    }


    // START MENU / INSTRUCTIONS (normal mode only)
    if (!gameStarted && !isMakeItYourOwnMode) {
        imageContext.save();
        imageContext.globalAlpha = 0.92;
        const panelWidth = 360;
        const panelHeight = 210;
        const px = (w - panelWidth) / 2;
        const py = (h - panelHeight) / 2;
        imageContext.fillStyle = "rgba(0,0,0,0.95)";
        imageContext.fillRect(px, py, panelWidth, panelHeight);
        imageContext.restore();

        imageContext.fillStyle = "lime";
        imageContext.font = "24px monospace";
        imageContext.fillText("BATTLEZONE", w / 2 - 70, h / 2 - 55);

        imageContext.fillStyle = "white";
        imageContext.font = "15px monospace";
        let y = h / 2 - 20;
        imageContext.fillText("Controls:", w / 2 - 150, y);
        y += 22;
        imageContext.fillText("Arrow keys  - move", w / 2 - 150, y);
        y += 18;
        imageContext.fillText("Space       - shoot", w / 2 - 150, y);
        y += 18;
        imageContext.fillText("Esc         - reset", w / 2 - 150, y);
        y += 26;

        imageContext.fillStyle = "yellow";
        imageContext.font = "18px monospace";
        imageContext.fillText("Press 'P' to start", w / 2 - 100, y);
    }


	// RESPAWN MESSAGE
	if (!playerAlive) {
		imageContext.fillStyle = "red";
		imageContext.font = "20px monospace";
		imageContext.fillText("Destroyed! Respawning...", w / 2 - 120, 40);
	}

	// WIN SCREEN (after wave 5)
    if (hasWonGame) {
        imageContext.save();
        imageContext.globalAlpha = 0.94;
        const panelWidth = 420;
        const panelHeight = 180;
        const px = (w - panelWidth) / 2;
        const py = (h - panelHeight) / 2;
        imageContext.fillStyle = "rgba(0,0,0,0.95)";
        imageContext.fillRect(px, py, panelWidth, panelHeight);
        imageContext.restore();

        imageContext.fillStyle = "lime";
        imageContext.font = "26px monospace";
        imageContext.fillText("YOU BEAT ALL 5 WAVES!", px + 30, py + 60);

        imageContext.fillStyle = "white";
        imageContext.font = "18px monospace";
        imageContext.fillText("Press '!' to play waves again", px + 40, py + 100);
        imageContext.fillText("Press 'P' for normal mode",    px + 40, py + 130);

        return;
    }


}




function createCubeModel(size, color, texture) {
	const s = size * 0.5;

	//24 positions bcz 4 vertices and 6 faces
	const positions = [
		// front
		-s, -s,  s,
		 s, -s,  s,
		 s,  s,  s,
		-s,  s,  s,

		// back
		-s, -s, -s,
		-s,  s, -s,
		 s,  s, -s,
		 s, -s, -s,

		// top
		-s,  s, -s,
		-s,  s,  s,
		 s,  s,  s,
		 s,  s, -s,

		// bottom
		-s, -s, -s,
		 s, -s, -s,
		 s, -s,  s,
		-s, -s,  s,

		// right
		 s, -s, -s,
		 s,  s, -s,
		 s,  s,  s,
		 s, -s,  s,

		// left
		-s, -s, -s,
		-s, -s,  s,
		-s,  s,  s,
		-s,  s, -s
	];

	const normals = [
		// front
		0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
		// back
		0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,
		// top
		0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
		// bottom
		0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,
		// right
		1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
		// left
		-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
	];

	// UVs: each face uses a clean 0–1 range so textures are not stretched/tiling oddly
	const texcoords = [
		// front
		0, 0,
		1, 0,
		1, 1,
		0, 1,

		// back
		0, 0,
		1, 0,
		1, 1,
		0, 1,

		// top
		0, 0,
		1, 0,
		1, 1,
		0, 1,

		// bottom
		0, 0,
		1, 0,
		1, 1,
		0, 1,

		// right
		0, 0,
		1, 0,
		1, 1,
		0, 1,

		// left
		0, 0,
		1, 0,
		1, 1,
		0, 1
	];

	const indices = [
		// front
		0, 1, 2,  0, 2, 3,
		// back
		4, 5, 6,  4, 6, 7,    
		// top   
		8, 9,10,  8,10,11, 
		// bottom      
		12,13,14, 12,14,15, 
		// right     
		16,17,18, 16,18,19,  
		// left    
		20,21,22, 20,22,23       
	];

	const mat = {
        ambient: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3],
        diffuse: color, 
        specular: [0.8, 0.8, 0.8],
        n: 16
    };

    // if this cube has a texture, keep lighting neutral so we don't tint the texture
    if (texture) {
        mat.ambient = [0.2, 0.2, 0.2];
        mat.diffuse = [1.0, 1.0, 1.0];
    }


	const vBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	const nBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	const tBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

	const iBuf = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuf);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	return {
        vertexBuffer: vBuf,
        normalBuffer: nBuf,
        texBuffer: tBuf,
        indexBuffer: iBuf,
        indexCount: indices.length,
        texture: texture || null,
        material: mat
    };
}


function createPyramidModel(size, color, texture) {
    const s = size * 0.5;

    // Base Corners 
    const b0 = [-s, 0, -s]; // back-left
    const b1 = [ s, 0, -s]; // back-right
    const b2 = [ s, 0, s]; // front-right
    const b3 = [-s, 0, s]; // front-left
    
	const topPoint = [0, s, 0]; // top point

    const positions = [];
    const normals = [];
    const texcoords = [];

    function pushTri(a, b, c, n) {
        // positions
        positions.push(a[0], a[1], a[2]);
        positions.push(b[0], b[1], b[2]);
        positions.push(c[0], c[1], c[2]);

        // normals (same per-vertex, flat shading)
        for (let i = 0; i < 3; i++) {
            normals.push(n[0], n[1], n[2]);
        }

        // simple UVs 
        texcoords.push(0, 0, 1, 0, 0.5, 1);
    }

    // Base (facing downwards)
    // Tri 1: b0, b1, b2
    pushTri(b0, b1, b2, [0, -1, 0]);
    // Tri 2: b0, b2, b3
    pushTri(b0, b2, b3, [0, -1, 0]);

    // Side faces 

    // Front (+Z): b3, b2, topPoint   
    pushTri(b3, b2, topPoint, [0, 0.7071, 0.7071]);

    // Right (+X): b2, b1, topPoint 
    pushTri(b2, b1, topPoint, [0.7071, 0.7071, 0]);

    // Back (-Z): b1, b0, topPoint 
    pushTri(b1, b0, topPoint, [0, 0.7071, -0.7071]);

    // Left (-X): b0, b3, topPoint 
    pushTri(b0, b3, topPoint, [-0.7071, 0.7071, 0]);

    // Indices: just draw all triangles in order
    const vertexCount = positions.length / 3;
    const indices = [];
    for (let i = 0; i < vertexCount; i++) {
        indices.push(i);
    }

    // Material: same pattern as cube, so lighting behaves identically
    const mat = {
        ambient: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3],
        diffuse: color,
        specular: [0.8, 0.8, 0.8],
        n: 16
    };

    // If a texture is ever used, keep lighting neutral so we don’t tint it
    if (texture) {
        mat.ambient = [0.2, 0.2, 0.2];
        mat.diffuse = [1.0, 1.0, 1.0];
    }

    // Build GL buffers
    const vBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const nBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const tBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

    const iBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        vertexBuffer: vBuf,
        normalBuffer: nBuf,
        texBuffer:    tBuf,
        indexBuffer:  iBuf,
        indexCount:   indices.length,
        texture:      texture || null,
        material:     mat
    };
}

function createHemisphereModel(radius, color, rings = 6, segments = 12) {
	const positions = [];
	const normals = [];
	const texcoords = [];
	const indices = [];

	for (let r = 0; r <= rings; r++) {
		const v = r / rings;
		const phi = v * (Math.PI / 2);

		const y = radius * Math.sin(phi);
		const ringRad = radius * Math.cos(phi);

		for (let s = 0; s <= segments; s++) {
			const u = s / segments;
			const theta = u * 2 * Math.PI;
			const x = ringRad * Math.cos(theta);
			const z = ringRad * Math.sin(theta);

			positions.push(x, y, z);
			const len = Math.sqrt(x * x + y * y + z * z) || 1;
			normals.push(x / len, y / len, z / len);
			texcoords.push(u, 1 - v);
		}
	}

	const cols = segments + 1;
	for (let r = 0; r < rings; r++) {
		for (let s = 0; s < segments; s++) {
			const i0 = r * cols + s;
			const i1 = i0 + 1;
			const i2 = i0 + cols;
			const i3 = i2 + 1;

			indices.push(i0, i2, i1);
			indices.push(i1, i2, i3);
		}
	}

	const vBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	const nBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	const tBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

	const iBuf = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuf);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	return {
		vertexBuffer: vBuf,
		normalBuffer: nBuf,
		texBuffer: tBuf,
		indexBuffer: iBuf,
		indexCount: indices.length,
		material: {
			ambient: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3],
			diffuse: color,
			specular: [0.8, 0.8, 0.8],
			n: 16
		}
	};
}

/************* BATTLEFIELD *************/
function setupBattlefield() {
    //practically a big square on the xz plane
	
	var s = 40.0; //-40 to +40

    var positions = [
        -s, 0, -s,
        s, 0, -s,
        s, 0, s,
        -s, 0, s
    ];

    var normals = [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ];

    // Use 0-1 UV coordinates for tiling
	var texcoords = [
		0, 0,
		1, 0,  
		1, 1,
		0, 1
	];


    var indices = [0, 1, 2, 0, 2, 3];

    var vBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    var nBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    var tBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

    var iBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    battlefield = {
        vertexBuffer: vBuf,
        normalBuffer: nBuf,
        texBuffer: tBuf,
        indexBuffer: iBuf,
        indexCount: indices.length,
        material: {
            ambient: [0.0, 0.0, 0.0],
            diffuse: [1.0, 1.0, 1.0],
            specular: [0.0, 0.0, 0.0],
            n: 4,
            alpha: 1.0
        }
    };

    // Load ground texture
    groundTexture = loadGroundTexture(gl, "ground1.png");

    // Solid color fallback
    blueGroundTexture = createSolidTexture(gl, 5, 5, 55, 255);
}

function drawGround(pvMatrix) {
    //makes sure the battlefield has been setup
	if (!battlefield) {
        console.error("No battlefield!");
        return;
    }

    var mMatrix = mat4.create();
    var pvmMatrix = mat4.create();

    mat4.identity(mMatrix);
    mat4.multiply(pvmMatrix, pvMatrix, mMatrix);

    gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix);
    gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix);

    // Neutral lighting for the ground
    gl.uniform3fv(ambientULoc, [0.0, 0.0, 0.0]);
    gl.uniform3fv(diffuseULoc, [1.0, 1.0, 1.0]);
    gl.uniform3fv(specularULoc, [0.0, 0.0, 0.0]);
    gl.uniform1f(shininessULoc, 1.0);
    gl.uniform1f(alphaULoc, 1.0);

    let tex = null;

    if (isMakeItYourOwnMode && groundTexture && groundTextureLoaded) {
        // In ! mode: use the actual ground1.png texture
        gl.uniform1f(tileScaleULoc, 2000.0);
        tex = groundTexture;
    } else {
        // In normal mode: solid dark blue "floor", no pattern
        // (already created this in setupBattlefield as blueGroundTexture)
        gl.uniform1f(tileScaleULoc, 1.0);
        tex = blueGroundTexture;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, battlefield.vertexBuffer);
    gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, battlefield.normalBuffer);
    gl.vertexAttribPointer(vNormAttribLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, battlefield.texBuffer);
    gl.vertexAttribPointer(texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, battlefield.indexBuffer);
    gl.drawElements(gl.TRIANGLES, battlefield.indexCount, gl.UNSIGNED_SHORT, 0);
}


/************* TANK TEXTURES *************/
function setUpTankTextures() {
    playerTankTexture = loadTexture(gl, "galvanized_blue.jpg");
    enemyTankTexture = loadTexture(gl, "tank.png"); 
}

/************* TANK MODELS *************/
function setupTankModels() {


	// Simple cube tanks for normal mode
	playerTankModel = createCubeModel(
		0.10,
		[0.3, 0.7, 0.2],
		playerTankTexture
	);

	enemyTankModel = createCubeModel(
		0.13,
		[1.6, 0.0, 0.0],
		enemyTankTexture
	);

    // CREATE MESHES FOR TANK PARTS

	var playerTreadModel = createCubeModel(1.0, [0.05, 0.05, 0.05]); 
    var playerHullModel = createCubeModel(1.0, [0.0, 0.3, 0.7]);
    var playerTurretModel = createHemisphereModel(0.7, [0.0, 0.4, 0.8], 12, 24);
    var playerBarrelModel = createCubeModel(1.0, [0.05, 0.05, 0.05]); 

    var enemyTreadModel = createCubeModel(1.0, [0.05, 0.05, 0.05]);
	var enemyHullModel = createCubeModel(1.0, [0.8, 0.05, 0.0]);
	var enemyTurretModel = createHemisphereModel(0.9, [0.8, 0.05, 0.0], 12, 24);
    var enemyBarrelModel = createCubeModel(1.0, [0.05, 0.05, 0.05]);

	//general tank scale
    var tankScale = 0.15;

    // Relative scales for each part (x, y, z)
    var hullScale = vec3.fromValues(1.3 * tankScale, 0.5 * tankScale, 2.0 * tankScale);
    var treadScale = vec3.fromValues(1.8 * tankScale, 0.25 * tankScale, 2.2 * tankScale);
    var turretScale = vec3.fromValues(0.75 * tankScale, 0.65 * tankScale, 1.0 * tankScale);
    var barrelScale = vec3.fromValues(0.15 * tankScale, 0.15 * tankScale, 2.8 * tankScale);

    // Half-heights used to stack pieces nicely
    var hullHalfHeight = hullScale[1] * 0.5;
    var treadHalfHeight = treadScale[1] * 0.5;
    var turretHalfHeight = turretScale[1] * 0.2;

    detailedTankBodyHalfHeight = hullHalfHeight;

    // Center Y positions
    var hullCenterY = 0.0;

    // Treads: slightly below hull but still touching
    var treadCenterY  = -hullHalfHeight + treadHalfHeight * 0.9;

    // Turret: sits on top of hull
    var turretCenterY = hullCenterY + hullHalfHeight + turretHalfHeight * 0.9;

    // Barrel should stick out of the turret dome
    var barrelCenterY = turretCenterY;

    // Forward / backward offsets along z
    var barrelForwardOffset = 1.45 * tankScale;
    var turretBackOffset = 0.18 * tankScale;

    // PLAYER TANK PARTS

	detailedPlayerTankParts.push({
        model: playerTreadModel,
        localPosition: vec3.fromValues(0.0, treadCenterY, 0.0),
        localRotation: vec3.fromValues(0.0, 0.0, 0.0),
        localScale: treadScale
    });

    detailedPlayerTankParts.push({
        model: playerHullModel,
        localPosition: vec3.fromValues(0.0, hullCenterY, 0.0),
        localRotation: vec3.fromValues(0.0, 0.0, 0.0),
        localScale: hullScale
    });

    detailedPlayerTankParts.push({
        model: playerTurretModel,
        localPosition: vec3.fromValues(0.0, turretCenterY, -turretBackOffset),
        localRotation: vec3.fromValues(0.0, 0.0, 0.0),
        localScale: turretScale
    });

    detailedPlayerTankParts.push({
        model: playerBarrelModel,
        localPosition: vec3.fromValues(0.0, barrelCenterY, barrelForwardOffset),
        localRotation: vec3.fromValues(0.0, 0.0, 0.0),
        localScale: barrelScale
    });


	// ENEMY TANK PARTS

	detailedEnemyTankParts.push({
        model: enemyTreadModel,
        localPosition: vec3.fromValues(0.0, treadCenterY, 0.0),
        localRotation: vec3.fromValues(0.0, 0.0, 0.0),
        localScale: treadScale
    });

    detailedEnemyTankParts.push({
        model: enemyHullModel,
        localPosition: vec3.fromValues(0.0, hullCenterY, 0.0),
        localRotation: vec3.fromValues(0.0, 0.0, 0.0),
        localScale: hullScale
    });

    detailedEnemyTankParts.push({
        model: enemyTurretModel,
        localPosition: vec3.fromValues(0.0, turretCenterY, -turretBackOffset),
        localRotation: vec3.fromValues(0.0, 0.0, 0.0),
        localScale: turretScale
    });

    detailedEnemyTankParts.push({
        model: enemyBarrelModel,
        localPosition: vec3.fromValues(0.0, barrelCenterY, barrelForwardOffset),
        localRotation: vec3.fromValues(0.0, 0.0, 0.0),
        localScale: barrelScale
    });
}


/************* PROJECTILE MODELS *************/
function setupProjectileModels() {
    // small glowing dome for player bullet
    renderModels.playerShotModel = createHemisphereModel(
        0.03,
        [1.0, 0.9, 0.2],
        8, 16
    );

    // small red dome for enemy bullet
    renderModels.enemyShotModel = createHemisphereModel(
        0.03,
        [1.0, 0.3, 0.3], 
        8, 16
    );

    // bigger dome for explosion
    renderModels.explosionModel = createHemisphereModel(
        0.18,
        [1.0, 0.6, 0.1],
        10, 20
    );
}


/************* OBSTACLES *************/
function setupObstacles() {
    cubeModel = createCubeModel(0.22, [0.0, 0.5, 1.0]);
    pyramidModel = createPyramidModel(0.32, [0.3, 0.8, 1.0]);
    hemiModel = createHemisphereModel(0.22, [0.6, 0.2, 0.8], 12, 24);

    obstacles = [];

    const NUM_OBS = 95;
    const AREA = 4.5;
    const MIN_DIST_FROM_PLAYER = 0.8;
    const MIN_DIST_FROM_ENEMY = 0.8;
    const MIN_DIST_BETWEEN_OBS = 0.32;

    function dist2D_local(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dz * dz);
    }

    function validPos(x, z) {
        if (dist2D_local(x, z, playerPos[0], playerPos[2]) < MIN_DIST_FROM_PLAYER) {
            return false;
        }
        if (dist2D_local(x, z, enemyPos[0], enemyPos[2]) < MIN_DIST_FROM_ENEMY) {
            return false;
        }

        for (let o of obstacles) {
            if (dist2D_local(x, z, o.pos[0], o.pos[2]) < MIN_DIST_BETWEEN_OBS) {
                return false;
            }
        }
        return true;
    }

    for (let i = 0; i < NUM_OBS; i++) {
        let x;
        let z;
        let attempts = 0;
		//try to find an empty place in the area to place the obstacle
		//has to also find a valid position and if it takes too long, just break it
        do {
            x = (Math.random() * 2 - 1) * AREA;
            z = (Math.random() * 2 - 1) * AREA;
            attempts++;
            if (attempts > 80) {
                break;
            }
        } while (!validPos(x, z));

		const typeIndex = i % 4;
        let model;
        let radius;
        let texturedForDifferentMode = null;
        let yPos = 0.0;            
        let scale = [1, 1, 1]; 

        if (typeIndex === 0) {
            model = cubeModel;
            radius = 0.20;
            yPos = 0.11;
            scale = [1.0, 1.0, 1.0];
        } else if (typeIndex === 1) {
			model = pyramidModel;
			radius = 0.22;
			yPos = 0.0;
			scale = [0.9, 1.6, 0.9];
		} else {
            model = hemiModel;
            radius = 0.21;
            yPos = 0.0;
            scale = [0.8, 0.8, 0.8];
        }

        obstacles.push({
            type: ["cube", "pyramid", "hemi"][typeIndex],
            model: model,
            pos: vec3.fromValues(x, yPos, z),
            radius: radius,
            scale: scale,
        });

    }
}


/************* MOUNTAINS *************/
function setupMountains() {
	// Multiple mountain types (rocky, green, icy) in a far ring.
	mountainModels = [];

	const rockColor = [0.20, 0.26, 0.24];
	const greenColor = [0.15, 0.38, 0.13];
	const iceColor = [0.82, 0.88, 0.95];

	const baseSize = 2.2;
	const rockModel = createPyramidModel(baseSize, rockColor);
	const greenModel = createPyramidModel(baseSize * 1.05, greenColor);
	const iceModel = createPyramidModel(baseSize * 1.2, iceColor);

	mountainModels.push(rockModel);
	mountainModels.push(greenModel);
	mountainModels.push(iceModel);

	// keep a default reference
	mountainModel = rockModel;

	mountains = [];

	const count = 42;
	const baseRadius = 15.0; // far away ring
	const radiusJitter = 3.0; // uneven natural distances

	for (let i = 0; i < count; i++) {
		const angle = (i / count) * 2 * Math.PI;
		const jitter = (Math.random() - 0.5) * radiusJitter;
		const r = baseRadius + jitter;

		const x = Math.cos(angle) * r;
		const z = Math.sin(angle) * r;

		// height and width variation
		const heightScale = 1.8 + Math.random() * 1.8; // 1.8 – 3.6
		const widthScale = 1.2 + Math.random() * 0.9; // 1.2 – 2.1

		// choose style: taller ones tend to be icy, medium rocky, lower green
		let modelChoice;
		if (heightScale > 3.0) {
			modelChoice = iceModel;
		} else if (heightScale > 2.4) {
			modelChoice = rockModel;
		} else {
			modelChoice = greenModel;
		}

		mountains.push({
			model: modelChoice,
			pos: vec3.fromValues(x, 0.0, z),
			scale: [widthScale, heightScale, widthScale]
		});
	}
}


/************* 3D CROSSHAIR SETUP *************/
function setupCrosshair3D() {
	// Simple plus sign centered at origin in XZ-plane
	const L = 0.25;
	const positions = [
		-L, 0, 0, L, 0, 0, // horizontal line
		0, 0, -L, 0, 0, L // vertical line
	];

	crosshair3DBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, crosshair3DBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	crosshair3DVertexCount = 4;
}


/************* SHADERS  - like prog 4*************/
function setupShaders() {
	var vShaderCode = `
        attribute vec3 aVertexPosition;
        attribute vec3 aVertexNormal;
        attribute vec2 aTextureCoord;

        uniform mat4 umMatrix;
        uniform mat4 upvmMatrix;

        varying vec3 vWorldPos;
        varying vec3 vVertexNormal;
        varying vec2 vTextureCoord;

        void main(void) {
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vWorldPos4.xyz;
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vWorldNormal4.xyz);
            vTextureCoord = aTextureCoord;
        }
    `;

	var fShaderCode = `
        precision mediump float;

        uniform vec3 uEyePosition;
        uniform bool uUseLighting;

        uniform vec3 uLightAmbient;
        uniform vec3 uLightDiffuse;
        uniform vec3 uLightSpecular;
        uniform vec3 uLightPosition;
        uniform int  uBlendMode;

        uniform vec3  uAmbient;
        uniform vec3  uDiffuse;
        uniform vec3  uSpecular;
        uniform float uShininess;
        uniform float uAlpha;

        uniform sampler2D uSampler;
		uniform float uTileScale; 
        uniform bool  uKeyEnable;
        uniform vec3  uKeyColor;
        uniform float uKeyThresh;

        varying vec3 vWorldPos;
        varying vec3 vVertexNormal;
        varying vec2 vTextureCoord;

        void main(void) {
            vec3 ambient = uAmbient * uLightAmbient;

            vec3 normal = normalize(vVertexNormal);
            vec3 light  = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0, dot(normal, light));
            vec3 diffuse = uDiffuse * uLightDiffuse * lambert;

            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light + eye);
            float highlight = pow(max(0.0, dot(normal, halfVec)), uShininess);
            vec3 specular = uSpecular * uLightSpecular * highlight;

            // Base UVs from attributes
			vec2 uv = vTextureCoord;

			
			if (uTileScale > 1.0) {
				float baseMax = 20.0;
				vec2 norm = vTextureCoord / baseMax;
				uv = fract(norm * uTileScale);
			}

			vec4 tex = texture2D(uSampler, uv);


            if (uKeyEnable) {
                if (distance(tex.rgb, uKeyColor) < uKeyThresh) {
                    discard;
                }
            }

            float q = lambert < 0.25
                      ? 0.10
                      : (lambert < 0.75 ? 0.60 : 1.0);
            vec3 toonLit = uAmbient * uLightAmbient
                         + uDiffuse * uLightDiffuse * q
                         + specular;

            vec3 base   = tex.rgb;
            vec3 litAD  = ambient + diffuse;
            vec3 litADS = litAD + specular;

            vec3 outRGB;
            if (!uUseLighting) {
                outRGB = base;
            } else if (uBlendMode == 0) {
                outRGB = base;
            } else if (uBlendMode == 1) {
                outRGB = clamp(base * litADS, 0.0, 1.0);
            } else if (uBlendMode == 2) {
                outRGB = clamp(base + litAD, 0.0, 1.0);
            } else if (uBlendMode == 3) {
                outRGB = clamp(base * litAD + specular, 0.0, 1.0);
            } else {
                outRGB = clamp(base * toonLit, 0.0, 1.0);
            }

            float a = tex.a * uAlpha;
            if (a < 0.05) {
                discard;
            }

            gl_FragColor = vec4(outRGB, a);
        }
    `;

	try {
		var fShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fShader, fShaderCode);
		gl.compileShader(fShader);

		var vShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vShader, vShaderCode);
		gl.compileShader(vShader);

		if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
			throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
		} else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
			throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
		} else {
			var shaderProgram = gl.createProgram();
			gl.attachShader(shaderProgram, fShader);
			gl.attachShader(shaderProgram, vShader);
			gl.linkProgram(shaderProgram);

			if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
				throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
			} else {
				gl.useProgram(shaderProgram);

				vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition");
				vNormAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal");
				texCoordAttribLoc = gl.getAttribLocation(shaderProgram, "aTextureCoord");
				gl.enableVertexAttribArray(vPosAttribLoc);
				gl.enableVertexAttribArray(vNormAttribLoc);
				gl.enableVertexAttribArray(texCoordAttribLoc);

				mMatrixULoc = gl.getUniformLocation(shaderProgram, "umMatrix");
				pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix");

				eyePositionULoc = gl.getUniformLocation(shaderProgram, "uEyePosition");
				lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient");
				lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse");
				lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular");
				lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition");

				ambientULoc = gl.getUniformLocation(shaderProgram, "uAmbient");
				diffuseULoc = gl.getUniformLocation(shaderProgram, "uDiffuse");
				specularULoc = gl.getUniformLocation(shaderProgram, "uSpecular");
				shininessULoc = gl.getUniformLocation(shaderProgram, "uShininess");
				alphaULoc = gl.getUniformLocation(shaderProgram, "uAlpha");

				useLightingULoc = gl.getUniformLocation(shaderProgram, "uUseLighting");
				blendModeULoc = gl.getUniformLocation(shaderProgram, "uBlendMode");

				uKeyEnableULoc = gl.getUniformLocation(shaderProgram, "uKeyEnable");
				uKeyColorULoc = gl.getUniformLocation(shaderProgram, "uKeyColor");
				uKeyThreshULoc = gl.getUniformLocation(shaderProgram, "uKeyThresh");

				samplerULoc = gl.getUniformLocation(shaderProgram, "uSampler");
				tileScaleULoc = gl.getUniformLocation(shaderProgram, "uTileScale");

				gl.uniform3fv(eyePositionULoc, Eye);
				gl.uniform3fv(lightAmbientULoc, lightAmbient);
				gl.uniform3fv(lightDiffuseULoc, lightDiffuse);
				gl.uniform3fv(lightSpecularULoc, lightSpecular);
				gl.uniform3fv(lightPositionULoc, lightPosition);

				gl.uniform1i(samplerULoc, 0);
				gl.uniform1f(tileScaleULoc, 1.0);
				gl.uniform1i(useLightingULoc, gUseLighting);
				gl.uniform1i(blendModeULoc, gBlendMode);
				gl.uniform1f(alphaULoc, 1.0);

				gl.uniform1i(uKeyEnableULoc, 0);
				gl.uniform3f(uKeyColorULoc, 1.0, 1.0, 1.0);
				gl.uniform1f(uKeyThreshULoc, 0.33);
			}
		}
	} catch (e) {
		console.log(e);
	}
}

/************* CAMERA - Makes the camera chase the player from behind *************/
function updateCameraFromPlayer() {
	const forward = vec3.fromValues(Math.sin(playerHeading), 0, Math.cos(playerHeading)); //x and z comps

	Eye[0] = playerPos[0] - forward[0] * cameraOffsetBack;
	Eye[1] = cameraHeight;
	Eye[2] = playerPos[2] - forward[2] * cameraOffsetBack;

	Center[0] = playerPos[0] + forward[0] * 0.1;
	Center[1] = playerPos[1] + 0.1;
	Center[2] = playerPos[2] + forward[2] * 0.1;
}

/************* COLLISION HELPERS *************/
function dist2D(x1, z1, x2, z2) {
	const dx = x2 - x1;
	const dz = z2 - z1;
	return Math.sqrt(dx * dx + dz * dz);
}

//checks if the player can go to a certain place - collision detector
function canMovePlayerTo(nx, nz) {
	//check collision with enemy
	if (enemyAlive) {
		if (dist2D(nx, nz, enemyPos[0], enemyPos[2]) < playerRadius + enemyRadius) {
			return false;
		}
	}
	//check collision with obstacles
	for (let obs of obstacles) {
		if (dist2D(nx, nz, obs.pos[0], obs.pos[2]) < playerRadius + obs.radius * 0.75) {
    		return false;
		}

	}
	return true;
}

function canMoveEnemyTo(nx, nz) {
	// Keep some space from the player so the enemy doesn't sit on top of plater
	const distToPlayer = dist2D(nx, nz, playerPos[0], playerPos[2]);

	// Slightly relaxed min distance so they have more room to navigate
	if (distToPlayer < enemyMinDist * 0.85) {
		return false;
	}

	// Don't overlap the player tank
	if (distToPlayer < playerRadius + enemyRadius * 0.9) {
		return false;
	}

	for (let obs of obstacles) {
		const d = dist2D(nx, nz, obs.pos[0], obs.pos[2]);
		if (d < enemyRadius + obs.radius * 0.9) {
			return false;
		}
	}

	return true;
}


/************* LINE-OF-SIGHT CHECK *************/
//created by ChatGPT to check how close a bullet path etc for collision
function distancePointToSegment2D(px, pz, ax, az, bx, bz) {
	const vx = bx - ax;
	const vz = bz - az;
	const wx = px - ax;
	const wz = pz - az;
	const c1 = vx * wx + vz * wz;
	if (c1 <= 0) {
		return Math.sqrt(wx * wx + wz * wz);
	}
	const c2 = vx * vx + vz * vz;
	if (c2 <= c1) {
		const dx = px - bx;
		const dz = pz - bz;
		return Math.sqrt(dx * dx + dz * dz);
	}
	const t = c1 / c2;
	const projX = ax + t * vx;
	const projZ = az + t * vz;
	const dx = px - projX;
	const dz = pz - projZ;
	return Math.sqrt(dx * dx + dz * dz);
}

//can X see Y without an obstacle in the way
function hasLineOfSight(fromPos, toPos) {
    const ax = fromPos[0];
    const az = fromPos[2];
    const bx = toPos[0];
    const bz = toPos[2];

    for (let obs of obstacles) {

        const px = obs.pos[0];
        const pz = obs.pos[2];

        const d = distancePointToSegment2D(px, pz, ax, az, bx, bz);

        let blockRadius = obs.radius * 0.8;

        if (d < blockRadius) {
            return false;
        }
    }
    return true;
}




/************* SHOTS *************/
function getAimDirection() {
	// Ray from camera through the screen center
	const ray = vec3.fromValues(
		Center[0] - Eye[0],
		Center[1] - Eye[1],
		Center[2] - Eye[2]
	);
	vec3.normalize(ray, ray);

	const dir = vec3.fromValues(ray[0], 0, ray[2]);
	vec3.normalize(dir, dir);

	return dir;
}

function firePlayerShot() {
    if (!playerAlive) 
		return;
    if (!gameStarted) 
		return;

    if (playerFireCooldown > 0) 
		return;

	if (playerInvulnTimer > 0) 
		return;

    const aimDir = getAimDirection();
    playerShot.active = true;
    playerShot.traveled = 0;
    vec3.set(playerShot.pos, playerPos[0], 0.05, playerPos[2]);
    vec3.copy(playerShot.dir, aimDir);

    playerFireCooldown = playerFireDelay;

    playBeep(900, 0.04, 0.2);
}

function fireEnemyShot() {
	if (!gameStarted || !enemyAlive) {
		return;
	}
	if (enemyShot.active) {
		return;
	}

	if (!hasLineOfSight(enemyPos, playerPos)) {
		return;
	}

	const toPlayer = vec3.fromValues(
		playerPos[0] - enemyPos[0],
		0,
		playerPos[2] - enemyPos[2]
	);
	vec3.normalize(toPlayer, toPlayer);

	enemyShot.active = true;
	enemyShot.traveled = 0;
	vec3.set(
		enemyShot.pos,
		enemyPos[0] + toPlayer[0] * 0.12,
		0.05,
		enemyPos[2] + toPlayer[2] * 0.12
	);
	vec3.copy(enemyShot.dir, toPlayer);

	playBeep(500, 0.09, 0.2);
}



/************* ENEMY RESPAWN *************/
function spawnEnemyAtEdge() {
    const B = 2.5;
    const MAX_ATTEMPTS = 60;

	//try 60 random positions before we fallback
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let side = Math.floor(Math.random() * 4);
        let ex = 0;
        let ez = 0;

        if (side === 0) {
            ex = B;
            ez = (Math.random() * 2 - 1) * B;
        } else if (side === 1) {
            ex = -B;
            ez = (Math.random() * 2 - 1) * B;
        } else if (side === 2) {
            ex = (Math.random() * 2 - 1) * B;
            ez = B;
        } else {
            ex = (Math.random() * 2 - 1) * B;
            ez = -B;
        }

        // keep it out of player view cone
        const forward = vec3.fromValues(Math.sin(playerHeading), 0, Math.cos(playerHeading));
        const dx = ex - playerPos[0];
        const dz = ez - playerPos[2];
        const len = Math.sqrt(dx * dx + dz * dz);
        let nx = dx, nz = dz;
        if (len > 1e-5) {
            nx /= len;
            nz /= len;
        }
        const cosAng = nx * forward[0] + nz * forward[2];
        const fov = Math.PI / 4;
        if (cosAng > Math.cos(fov)) {
            ex = -ex;
            ez = -ez;
        }

        let ok = true;

        // not too close to player
        if (dist2D(ex, ez, playerPos[0], playerPos[2]) < enemyMinDist + enemyRadius) {
            ok = false;
        }

        // not overlapping any obstacle
        if (ok) {
            for (let obs of obstacles) {
                if (dist2D(ex, ez, obs.pos[0], obs.pos[2]) < enemyRadius + obs.radius + 0.05) {
                    ok = false;
                    break;
                }
            }
        }

        if (ok) {
            vec3.set(enemyPos, ex, 0.0, ez);
            enemyAlive = true;
            enemyState = "chase";
            enemyWanderTimer = 0;
            enemyChaseDelay = 0.0;
            enemyShootCooldown = 2.0;
            enemyHeading = 0.0;
            return;
        }
    }

    // Fallback: put enemy 1 unit behind player
    vec3.set(
        enemyPos,
        playerPos[0] - 1.0,
        0.0,
        playerPos[2] - 1.0
    );
    enemyAlive = true;
    enemyState = "chase";
    enemyShootCooldown = 2.0;
    enemyHeading = 0.0;
}

function spawnWaveEnemyAtEdge() {
    const B = 2.5;
    const MAX_ATTEMPTS = 60;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let side = Math.floor(Math.random() * 4);
        let ex = 0;
        let ez = 0;

        if (side === 0) {
            ex = B;
            ez = (Math.random() * 2 - 1) * B;
        } else if (side === 1) {
            ex = -B;
            ez = (Math.random() * 2 - 1) * B;
        } else if (side === 2) {
            ex = (Math.random() * 2 - 1) * B;
            ez = B;
        } else {
            ex = (Math.random() * 2 - 1) * B;
            ez = -B;
        }

        // keep out of player forward cone a bit
        const forward = vec3.fromValues(Math.sin(playerHeading), 0, Math.cos(playerHeading));
        const dx = ex - playerPos[0];
        const dz = ez - playerPos[2];
        const len = Math.sqrt(dx * dx + dz * dz) || 1.0;
        const nx = dx / len;
        const nz = dz / len;
        const cosAng = nx * forward[0] + nz * forward[2];

        const fov = Math.PI / 4;
        if (cosAng > Math.cos(fov)) {
            ex = -ex;
            ez = -ez;
        }

        // avoid spawning inside obstacles
        let ok = true;
        for (let obs of obstacles) {
            if (dist2D(ex, ez, obs.pos[0], obs.pos[2]) < enemyRadius + obs.radius + 0.05) {
                ok = false;
                break;
            }
        }

        if (ok) {
            return {
                pos: vec3.fromValues(ex, 0.0, ez),
                radius: enemyRadius,
                alive: true,
                heading: 0.0,
                shootCooldown: 2.0 + Math.random(), // each enemy fires on its own timer
            };
        }
    }

    // fallback somewhere behind player
    return {
        pos: vec3.fromValues(playerPos[0] - 1.0, 0.0, playerPos[2] - 1.0),
        radius: enemyRadius,
        alive: true,
        heading: 0.0,
        shootCooldown: 2.0 + Math.random()
    };
}

function spawnEnemiesForWave(count) {
	waveEnemies = [];
    for (let i = 0; i < count; i++) {
        waveEnemies.push(spawnWaveEnemyAtEdge());
    }
}


/************* PLAYER RESPAWN *************/
function killPlayer() {
    if (!playerAlive) 
		return;

    // Either spawn-invuln or ability shield protects you from dying
    if (playerInvulnTimer > 0 || playerAbilityInvulnTimer > 0) 
		return;

    score -= 150;
    playBeep(260, 0.18, 0.3);

    if (isMakeItYourOwnMode) {
        if (playerLives > 1) {
            playerLives--;
            playerAlive = false;
            playerRespawnTimer = 3.0;
            return;
        } else {
            startDifferentModeAtWave1();
            return;
        }
    }

    // normal mode behavior
    playerAlive = false;
    playerRespawnTimer = 3.0;
}

function respawnPlayer() {
    playerAlive = true;
    // fade + no shooting right after respawn
    playerInvulnTimer = 3.0;
}


/************* GAME RESET *************/
function resetGame() {
    // reset back to the standard mode
    isMakeItYourOwnMode = false;
    differentGameModeStage = 0;

    // wave mode reset
    inUpgradeMenu = false;
    currentWave = 1;
    enemiesRemainingInWave = 0;
    playerFireCooldown = 0.0;

    // Reset core gameplay values
    score = 0;
    vec3.set(playerPos, 0.5, 0.0, 0.3);
    playerHeading = 0.0;
    playerAlive = true;
    playerRespawnTimer = 0;
    playerInvulnTimer = 0;
	playerAbilityInvulnTimer = 0;

    vec3.set(enemyPos, 0.2, 0.0, 0.8);
    enemyAlive = true;
    enemyState = "wander";
    enemyWanderTimer = 0;
    enemyChaseDelay = 4.0;
    enemyRespawnTimer = 0;
    enemyShootCooldown = 2.5;
	waveEnemies = [];
    enemyHeading = 0.0;

    playerShot.active = false;
    enemyShot.active  = false;
    explosions = [];
    radarBeepTimer = 0;

    // reset abilities
    abilityInvincibleCharges = 0;
    abilityNukeCharges = 0;
    abilityTeleportCharges = 0;
    playerMultiShotLevel = 0;

    // Rebuild environment elements 
    setupObstacles();
    setupMountains();

    gameStarted = false;
}


/************* UPDATE LOOP *************/
function updatePlayer(dt) {
	if (!playerAlive) {
		return;
	}

	const moveSpeed = playerMoveSpeed;
    const turnSpeed = 2.0;

	if (keysDown["ArrowLeft"]) {
		playerHeading += turnSpeed * dt;
	}
	if (keysDown["ArrowRight"]) {
		playerHeading -= turnSpeed * dt;
	}

	const forward = vec3.fromValues(Math.sin(playerHeading), 0, Math.cos(playerHeading));

	let move = 0;
	if (keysDown["ArrowUp"]) {
		move += moveSpeed * dt;
	}
	if (keysDown["ArrowDown"]) {
		move -= moveSpeed * dt;
	}

	if (Math.abs(move) > 1e-6) {
		const nx = playerPos[0] + forward[0] * move;
		const nz = playerPos[2] + forward[2] * move;
		if (canMovePlayerTo(nx, nz)) {
			playerPos[0] = nx;
			playerPos[2] = nz;
		}
	}
}

/************* ENEMY HEADING SMOOTHING *************/

//used chatGPTs help with this because previously, It was jittering and kind of teleporting with the way it was moving
//so I asked how can i make it smoother and natural
function smoothlyUpdateEnemyHeading(desiredDirection, deltaTime) {
    // This function slowly turns the enemy to face a certain direction
    // desiredDirection = which way we want the enemy to face (a vector)
    // deltaTime = how much time passed since the last frame (in seconds)

    // Calculate how long the desired direction is, using only X and Z
    var lengthSquared = desiredDirection[0] * desiredDirection[0]
        + desiredDirection[2] * desiredDirection[2];

    // If the direction is basically zero, don't change anything
    if (lengthSquared < 1e-6) {
        return;
    }

    // Turn the desired direction into an angle in radians on the ground
    // Math.atan2 gives us which way this vector is pointing
    var desiredHeading = Math.atan2(desiredDirection[0], desiredDirection[2]);

    // Find how much we need to turn from our current angle to the desired angle
    var angleDifference = desiredHeading - enemyHeading;

    // If the difference is bigger than PI (180°), wrap it around the circle
    // so we always choose the shortest turn direction.
    while (angleDifference > Math.PI) {
        angleDifference -= 2.0 * Math.PI; // subtract a full circle (360° in radians)
    }
    // Same thing if the difference is less than -PI, wrap it the other way
    while (angleDifference < -Math.PI) {
        angleDifference += 2.0 * Math.PI; // add a full circle
    }

    // This is how fast the enemy is allowed to turn per second (in radians)
    var maximumTurnRate = 2.5; // about 143 degrees per second

    // Figure out how much the enemy is allowed to turn during frame
    var maximumTurnThisFrame = maximumTurnRate * deltaTime;

    // If we need to turn more than the max for this frame, clamp it down.
    if (angleDifference > maximumTurnThisFrame) {
        angleDifference = maximumTurnThisFrame; // turn as much as we can to the left
    } else if (angleDifference < -maximumTurnThisFrame) {
        angleDifference = -maximumTurnThisFrame; // turn as much as we can to the right
    }

    // apply the turn: add the small angle to the enemy's current heading.
    enemyHeading += angleDifference;
}



// Enemy movement smoothing and obstacle side preference.
var enemyLastDir = vec3.fromValues(0.0, 0.0, 1.0);
var enemyPreferredSide = 1;	// +1 or -1, used when sliding around obstacles
var enemyObstacleSideTimer = 0.0; // how long to keep the same obstacle side choice



/************* ENEMY UPDATE *************/
function updateEnemy(deltaTime) {

	// If the enemy tank is currently dead...
	if (!enemyAlive) {
		if (enemyRespawnTimer > 0.0) {
			enemyRespawnTimer -= deltaTime;
			if (enemyRespawnTimer <= 0.0) {
				spawnEnemyAtEdge();
			}
		}
		// If the enemy is dead, we do not run any more logic in this function.
		return;
	}

	// If enemy is alive, its state is just follow the player)
	enemyState = "chase";
	// No chase delay right now (enemy is free to move).
	enemyChaseDelay = 0.0;

	// Make the which side to slide around obstacles timer tick down
	enemyObstacleSideTimer -= deltaTime;
	
	// Don't let this timer go negative
	if (enemyObstacleSideTimer < 0.0) {
		enemyObstacleSideTimer = 0.0;
	}

	// BASE DIRECTION: point from enemy straight toward the player.
	var directionToPlayer = vec3.fromValues(
		playerPos[0] - enemyPos[0], 
		0.0, 
		playerPos[2] - enemyPos[2] 
	);

	// How far squared is the player from the enemy
	var distanceSquaredToPlayer =
		directionToPlayer[0] * directionToPlayer[0] +
		directionToPlayer[2] * directionToPlayer[2];

	// If the distance is not tiny...
	if (distanceSquaredToPlayer > 1e-6) {
		// Get the real distance
		var distanceToPlayer = Math.sqrt(distanceSquaredToPlayer);
		// Turn directionToPlayer into a unit vector 
		directionToPlayer[0] /= distanceToPlayer;
		directionToPlayer[2] /= distanceToPlayer;
	} else {
		// If the player is basically on top of the enemy,
		// reuse the last direction we were moving
		directionToPlayer[0] = enemyLastDir[0];
		directionToPlayer[2] = enemyLastDir[2];
	}

	// DESIRED DIRECTION starts as go toward player
	var desiredDirection = vec3.create();
	vec3.copy(desiredDirection, directionToPlayer);

	// If the enemy cannot see the player an obstacle is in the way
	if (!hasLineOfSight(enemyPos, playerPos)) {
		// If our side choice timer reached zero, pick a new side to slide (left or right)
		if (enemyObstacleSideTimer === 0.0) {
			// enemyPreferredSide = 1 or -1, chosen randomly.
			enemyPreferredSide = (Math.random() < 0.5) ? 1 : -1;
			// Keep this side for 0.8 seconds to avoid jittery flipping.
			enemyObstacleSideTimer = 0.8;
		}

		// Up direction in 3D (used for cross products to get sideways vectors).
		var worldUp = vec3.fromValues(0.0, 1.0, 0.0);
		// This will hold the sideways direction.
		var sidewaysDirection = vec3.create();

		// If we prefer side = 1, we slide one way (left).
		if (enemyPreferredSide === 1) {
			// Cross product worldUp × directionToPlayer gives a left-ish vector
			vec3.cross(sidewaysDirection, worldUp, directionToPlayer); // left
		} else {
			// Cross product directionToPlayer × worldUp gives the opposite side (right-ish)
			vec3.cross(sidewaysDirection, directionToPlayer, worldUp);  // right
		}

		// Check how long this sideways vector is 
		var sideLenSq =
			sidewaysDirection[0] * sidewaysDirection[0] +
			sidewaysDirection[2] * sidewaysDirection[2];

		// If sidewaysDirection is not basically zero...
		if (sideLenSq > 1e-6) {
			var sideLen = Math.sqrt(sideLenSq);
			sidewaysDirection[0] /= sideLen;
			sidewaysDirection[2] /= sideLen;

			// sideWeight decides how much "strafe" vs "straight at the player" we do.
			var sideWeight = 0.7; // 0 = no strafe, 1 = pure strafe.
			// Mix forward direction and sideways direction to get a slanted slide path.
			desiredDirection[0] = directionToPlayer[0] + sidewaysDirection[0] * sideWeight;
			desiredDirection[2] = directionToPlayer[2] + sidewaysDirection[2] * sideWeight;
		}
	}

	// If we are too close to the player, try to circle around them instead of pushing in.
	if (distanceSquaredToPlayer < enemyMinDist * enemyMinDist * 0.9) {
		// circleDir will be the direction we move to circle the player.
		var circleDir = vec3.create();
		var worldUp2 = vec3.fromValues(0.0, 1.0, 0.0);
		// Cross product gives us a "circle around them" direction.
		vec3.cross(circleDir, worldUp2, directionToPlayer); // circle around the player
		// Check the length squared of this circle direction.
		var cLenSq = circleDir[0] * circleDir[0] + circleDir[2] * circleDir[2];
		if (cLenSq > 1e-6) {
			// Normalize circleDir
			var cLen = Math.sqrt(cLenSq);
			circleDir[0] /= cLen;
			circleDir[2] /= cLen;
			
			var closeBlend = 0.8;
			desiredDirection[0] =
				directionToPlayer[0] * (1.0 - closeBlend) + circleDir[0] * closeBlend;
			desiredDirection[2] =
				directionToPlayer[2] * (1.0 - closeBlend) + circleDir[2] * closeBlend;
		}
	}

	// SMOOTH THE DIRECTION 
	// This part makes direction changes smooth and not super jittery.
	var smoothingSpeed = 6.0; // higher = faster reaction, lower = slower reaction.
	// blendFactor says how much of the new direction to mix in this frame.
	var blendFactor = smoothingSpeed * deltaTime;
	if (blendFactor > 1.0) {
		blendFactor = 1.0;
	}

	// Check if desiredDirection is not a zero vector.
	var ddLenSq =
		desiredDirection[0] * desiredDirection[0] +
		desiredDirection[2] * desiredDirection[2];
	if (ddLenSq < 1e-6) {
		// If it's too small, just keep using the last direction we had.
		vec3.copy(desiredDirection, enemyLastDir);
	} else {
		// Otherwise normalize desiredDirection so its length is 1.
		var ddLen = Math.sqrt(ddLenSq);
		desiredDirection[0] /= ddLen;
		desiredDirection[2] /= ddLen;
	}

	// Check the length of the previous direction we were using.
	var lastLenSq =
		enemyLastDir[0] * enemyLastDir[0] +
		enemyLastDir[2] * enemyLastDir[2];

	if (lastLenSq < 1e-6) {
		// If we had no good last direction, just snap to the desired direction.
		vec3.copy(enemyLastDir, desiredDirection);
	} else {
		// Otherwise, blend last direction and new desired direction
		var blendedDirection = vec3.create();
		
		// X: move a bit from old X to new X
		blendedDirection[0] = enemyLastDir[0] +
			(desiredDirection[0] - enemyLastDir[0]) * blendFactor;
		
		// Y stays 0 (we only move on ground)
		blendedDirection[1] = 0.0;
		
		// Z: move a bit from old Z to new Z
		blendedDirection[2] = enemyLastDir[2] +
			(desiredDirection[2] - enemyLastDir[2]) * blendFactor;

		// Length squared of this blended direction
		var bLenSq =
			blendedDirection[0] * blendedDirection[0] +
			blendedDirection[2] * blendedDirection[2];

		if (bLenSq > 1e-6) {
			// Normalize the blended direction.
			var bLen = Math.sqrt(bLenSq);
			blendedDirection[0] /= bLen;
			blendedDirection[2] /= bLen;
			// Save it as the new last direction for the next frame
			vec3.copy(enemyLastDir, blendedDirection);
		} else {
			vec3.copy(enemyLastDir, desiredDirection);
		}
	}

	// MOVE + ROTATE ENEMY

	// We start with movementDirection = the smoothed direction we decided above.
	var movementDirection = vec3.clone(enemyLastDir);
	// How far the enemy wants to move this frame.
	var stepDistance = enemySpeed * deltaTime;

	// Make sure movementDirection is normalized
	var mdLenSq = movementDirection[0] * movementDirection[0] +
                  movementDirection[2] * movementDirection[2];
	if (mdLenSq > 1e-6) {
		var mdLen = Math.sqrt(mdLenSq);
		movementDirection[0] /= mdLen;
		movementDirection[2] /= mdLen;
	} else {
		// If something went wrong and we lost our direction,
		// fall back to point straight at the player
		movementDirection[0] = playerPos[0] - enemyPos[0];
		movementDirection[2] = playerPos[2] - enemyPos[2];
		var fixLenSq = movementDirection[0] * movementDirection[0] +
                       movementDirection[2] * movementDirection[2];
		if (fixLenSq > 1e-6) {
			var fixLen = Math.sqrt(fixLenSq);
			movementDirection[0] /= fixLen;
			movementDirection[2] /= fixLen;
		}
	}

	// Now we create a list of possible directions to try:
	// forward, left, right, and a small backup.
	var candidates = [];

	// 1) Forward: this is the ideal movement direction.
	candidates.push(vec3.clone(movementDirection));

	// 2) Left and right: rotate the forward direction by 45 degrees.
	var angle = Math.PI / 4; 
	var cosA = Math.cos(angle);
	var sinA = Math.sin(angle);

	// Left: rotate movementDirection by +angle.
	var leftX = movementDirection[0] * cosA - movementDirection[2] * sinA;
	var leftZ = movementDirection[0] * sinA + movementDirection[2] * cosA;
	var leftLenSq = leftX * leftX + leftZ * leftZ;
	if (leftLenSq > 1e-6) {
		var leftLen = Math.sqrt(leftLenSq);
		candidates.push(vec3.fromValues(leftX / leftLen, 0.0, leftZ / leftLen));
	}

	// Right: rotate movementDirection by -angle.
	var rightX = movementDirection[0] * cosA + movementDirection[2] * sinA;
	var rightZ = -movementDirection[0] * sinA + movementDirection[2] * cosA;
	var rightLenSq = rightX * rightX + rightZ * rightZ;
	if (rightLenSq > 1e-6) {
		var rightLen = Math.sqrt(rightLenSq);
		candidates.push(vec3.fromValues(rightX / rightLen, 0.0, rightZ / rightLen));
	}

	// 3) Backup: move a little backwards if every forward option fails.
	candidates.push(vec3.fromValues(
		-movementDirection[0],
		 0.0,
		-movementDirection[2]
	));

	// finalDir = direction we actually end up using this frame.
	var finalDir = vec3.clone(movementDirection);
	// moved = did we actually move this frame or not.
	var moved = false;

	// Try each candidate direction (forward, left, right, backup).
	for (var ci = 0; ci < candidates.length; ci++) {
		var dir = candidates[ci];
		// Where we would be if we walked one step in this direction.
		var tryX = enemyPos[0] + dir[0] * stepDistance;
		var tryZ = enemyPos[2] + dir[2] * stepDistance;

		// Check if that position is allowed (no collisions).
		if (canMoveEnemyTo(tryX, tryZ)) {
			// If it's safe, update the enemy position.
			enemyPos[0] = tryX;
			enemyPos[2] = tryZ;
			finalDir = dir;
			// Mark that we did move.
			moved = true;
			break;
		}
	}

	// Rotate the enemy tank so that it faces the direction we actually moved 
	smoothlyUpdateEnemyHeading(finalDir, deltaTime);


	// Shooting logic: reduce the timer until we can shoot again.
	enemyShootCooldown -= deltaTime;
	// If the cooldown reached 0 or below...
	if (enemyShootCooldown <= 0.0) {
		// Fire a shot at the player.
		fireEnemyShot();
		// Reset cooldown to a random time between about 3.5 and 4.5 seconds.
		enemyShootCooldown = 3.5 + Math.random();
	}
}


function initDifferentModeProgression() {
    currentWave = 1;
    enemiesRemainingInWave = 0;
    inUpgradeMenu = false;
    hasWonGame = false;

    playerShotSpeedLevel = 0;
    playerFireRateLevel = 0;
    playerShotRangeLevel = 0;

    playerFireDelay = 0.6;
    playerFireCooldown = 0.0;

    enemyRespawnTimer = 0.0;
    playerMaxLives = 1;
    playerLives = playerMaxLives;
    playerMoveSpeed = playerMoveSpeedBase;

    // reset abilities
    abilityInvincibleCharges = 0;
    abilityNukeCharges = 0;
    abilityTeleportCharges = 0;
    playerMultiShotLevel = 0;
}


// Number of enemies in each wave – easy to tweak:
function enemiesInWave(waveIndex) {
    return 3 + (waveIndex - 1) * 2;
}

function startWave(waveIndex) {
    currentWave = waveIndex;
    enemiesRemainingInWave  = enemiesInWave(waveIndex);
    inUpgradeMenu = false;
    hasWonGame = false;

    gameStarted = true;
    waveIntroTimer = 10.0; // show "WAVE X"

    enemyRespawnTimer = 0.0;

    // All enemies spawn at once for this wave
    spawnEnemiesForWave(enemiesRemainingInWave);
}


function startDifferentModeAtWave1() {
    resetGame();

    isMakeItYourOwnMode = true;
    differentGameModeStage = 0;
    gameStarted = true;
    inUpgradeMenu = false;

    // rebuild environment
    setupObstacles();
    setupMountains();

    initDifferentModeProgression();
    startWave(1);
}

function applyUpgradeAction(actionId) {
    switch (actionId) {
        case "speed":
            playerMoveSpeed *= 1.25;
            break;

        case "multiFire":
            playerMultiShotLevel++;
            playerFireRateLevel++;
            playerFireDelay *= 0.8;
            if (playerFireDelay < 0.12) 
				playerFireDelay = 0.12;
            break;

        case "invincible10":
            abilityInvincibleCharges++;
            break;

        case "bulletFast":
            playerShotSpeedLevel++;
            playerShot.speed *= 1.35;
            playerShot.maxDist *= 1.15;
            break;

        case "doubleLife":
            playerMaxLives++;
            playerLives = playerMaxLives;
            break;

        case "nukeRadius":
            abilityNukeCharges++;
            break;

        case "teleportSpawn":
            abilityTeleportCharges++;
            break;

        case "shield":
            playerShotRangeLevel++;
            playerAbilityInvulnTimer += 1.5;
            break;
    }
}


function activateInvincibilityAbility() {
    if (!isMakeItYourOwnMode) 
		return;
    if (abilityInvincibleCharges <= 0) 
		return;

    abilityInvincibleCharges--;
    playerAbilityInvulnTimer += 10.0;
}


function activateTeleportAbility() {
    if (!isMakeItYourOwnMode) 
		return;
    if (abilityTeleportCharges <= 0) 
		return;

    abilityTeleportCharges--;

    // Teleport back near spawn
    vec3.set(playerPos, 0.5, 0.0, 0.3);
    updateCameraFromPlayer();
}

function activateNukeAbility() {
    if (!isMakeItYourOwnMode) 
		return;
    if (abilityNukeCharges <= 0) 
		return;

    abilityNukeCharges--;

    const NUKE_RADIUS = 2.5;

    for (let e of waveEnemies) {
        if (!e.alive) 
			continue;

        if (dist2D(playerPos[0], playerPos[2], e.pos[0], e.pos[2]) < NUKE_RADIUS) {
            e.alive = false;
            enemiesRemainingInWave--;

            score += 100 * currentWave;

            explosions.push({
                pos: vec3.fromValues(e.pos[0], 0.05, e.pos[2]),
                age: 0,
                maxAge: 0.7
            });
        }
    }

    // If that finished the wave, go through the usual wave-clear logic
    if (enemiesRemainingInWave <= 0) {
        onEnemyKilledForWaveMode();
    }
}


function applyUpgradeChoice(slot) {
    if (!isMakeItYourOwnMode || !inUpgradeMenu) {
        return;
    }

    const idx = Math.min(
        Math.max(currentWave - 1, 0),
        waveUpgradeConfig.length - 1
    );
    const cfg = waveUpgradeConfig[idx];

    if (!cfg || !cfg.options || slot < 1 || slot > cfg.options.length) {
        return;
    }

    const opt = cfg.options[slot - 1];
    if (!opt) 
		return;

    applyUpgradeAction(opt.action);

    playerFireCooldown = 0.0;
    inUpgradeMenu = false;

    startWave(currentWave + 1);
}


function onEnemyKilledForWaveMode() {
    enemyAlive = false;

    //  NORMAL MODE 
    // In normal mode we only have the single enemy, so just respawn it.
    if (!isMakeItYourOwnMode) {
        enemyRespawnTimer = 3.0;
        return;
    }

    //WAVE MODE 
 
    if (enemiesRemainingInWave <= 0) {
        // Wave is finished
        if (currentWave >= 5) {
            // Beat all waves
            hasWonGame = true;
            gameStarted = false;
            inUpgradeMenu = false;
            enemyRespawnTimer = 0.0;
        } else {
            // Wave cleared -> show upgrade menu for next wave
            inUpgradeMenu = true;
            gameStarted = false;
            enemyRespawnTimer = 0.0;
        }
    } else {
        enemyRespawnTimer = 2.0;
    }
}



function updateWaveEnemies(dt) {
	//almost same logic as normal mode

	if (!isMakeItYourOwnMode) 
		return;

	for (let e of waveEnemies) {
		if (!e.alive) continue;

		// Direction FROM enemy TO player on the XZ plane
		const dir = vec3.fromValues(
			playerPos[0] - e.pos[0],
			0.0,
			playerPos[2] - e.pos[2]
		);
		const lenSq = dir[0] * dir[0] + dir[2] * dir[2];

		if (lenSq > 1e-6) {
			const len = Math.sqrt(lenSq);
			dir[0] /= len;
			dir[2] /= len;

			// This is the direction we’ll use for heading at the end
			let headingDirX = dir[0];
			let headingDirZ = dir[2];

			// Only move if we’re outside the minimum distance
			if (len > enemyMinDist) {
				const step = enemySpeed * dt;

				let moved = false;

				// 1) Try straight toward the player 
				let candX = e.pos[0] + dir[0] * step;
				let candZ = e.pos[2] + dir[2] * step;

				if (canMoveEnemyTo(candX, candZ)) {
					e.pos[0] = candX;
					e.pos[2] = candZ;
					moved = true;
				} else {
					// 2) Try sliding around the obstacle
					// Side vector perpendicular to dir
					const side = vec3.fromValues(-dir[2], 0.0, dir[0]);

					const forwardWeight = 0.6;
					const sideWeight = 0.9;

					const candidates = [];

					// forward + left
					candidates.push({
						x:
							e.pos[0] +
							(dir[0] * forwardWeight + side[0] * sideWeight) * step,
						z:
							e.pos[2] +
							(dir[2] * forwardWeight + side[2] * sideWeight) * step
					});

					// forward + right
					candidates.push({
						x:
							e.pos[0] +
							(dir[0] * forwardWeight - side[0] * sideWeight) * step,
						z:
							e.pos[2] +
							(dir[2] * forwardWeight - side[2] * sideWeight) * step
					});

					// pure side left
					candidates.push({
						x: e.pos[0] + side[0] * step,
						z: e.pos[2] + side[2] * step
					});

					// pure side right
					candidates.push({
						x: e.pos[0] - side[0] * step,
						z: e.pos[2] - side[2] * step
					});

					for (let c of candidates) {
						if (canMoveEnemyTo(c.x, c.z)) {
							// update heading direction based on the move we actually took
							let dx = c.x - e.pos[0];
							let dz = c.z - e.pos[2];
							const dLen = Math.sqrt(dx * dx + dz * dz);
							if (dLen > 1e-6) {
								dx /= dLen;
								dz /= dLen;
								headingDirX = dx;
								headingDirZ = dz;
							}

							e.pos[0] = c.x;
							e.pos[2] = c.z;
							moved = true;
							break;
						}
					}

					// 3) As a last resort, jitter slightly to avoid permanent stuck
					if (!moved) {
						const jitter = 0.2 * step;
						const angle = Math.random() * 2.0 * Math.PI;
						const jx = e.pos[0] + Math.cos(angle) * jitter;
						const jz = e.pos[2] + Math.sin(angle) * jitter;

						if (canMoveEnemyTo(jx, jz)) {
							let dx = jx - e.pos[0];
							let dz = jz - e.pos[2];
							const dLen = Math.sqrt(dx * dx + dz * dz);
							if (dLen > 1e-6) {
								dx /= dLen;
								dz /= dLen;
								headingDirX = dx;
								headingDirZ = dz;
							}

							e.pos[0] = jx;
							e.pos[2] = jz;
						}
					}
				}
			}

			// Rotate tank so its turret/body faces the direction it’s trying to move
			e.heading = Math.atan2(headingDirX, headingDirZ);
		}

		// Shooting
		e.shootCooldown -= dt;
		if (e.shootCooldown <= 0.0) {
			fireEnemyShotFrom(e);
			e.shootCooldown = 3.0 + Math.random();
		}
	}
}


function fireEnemyShotFrom(enemyObj) {
    if (!gameStarted) 
		return;
    if (!enemyObj || !enemyObj.alive) 
		return;

    if (enemyShot.active) 
		return;

    if (!hasLineOfSight(enemyObj.pos, playerPos)) {
        return;
    }

    const toPlayer = vec3.fromValues(
        playerPos[0] - enemyObj.pos[0],
        0,
        playerPos[2] - enemyObj.pos[2]
    );
    vec3.normalize(toPlayer, toPlayer);

    enemyShot.active = true;
    enemyShot.traveled = 0;
    vec3.set(
        enemyShot.pos,
        enemyObj.pos[0] + toPlayer[0] * 0.12,
        0.05,
        enemyObj.pos[2] + toPlayer[2] * 0.12
    );
    vec3.copy(enemyShot.dir, toPlayer);

    playBeep(500, 0.09, 0.2);
}


function updateShots(dt) {
	// small hitbox boost when multi-shot upgrades are taken
    const bulletRadiusBoost = playerMultiShotLevel * 0.03;
    // PLAYER SHOT 
    if (playerShot.active) {
        const step = playerShot.speed * dt;
        playerShot.pos[0] += playerShot.dir[0] * step;
        playerShot.pos[2] += playerShot.dir[2] * step;
        playerShot.traveled += step;

        // bullet lifetime
        if (playerShot.traveled > playerShot.maxDist) {
            playerShot.active = false;
        } else {
            // hit obstacles
            for (let obs of obstacles) {
                if (dist2D(
                    playerShot.pos[0], playerShot.pos[2],
                    obs.pos[0], obs.pos[2]
                ) < obs.radius * 0.9 + bulletRadiusBoost) {
                    playerShot.active = false;
                    explosions.push({
                        pos: vec3.clone(playerShot.pos),
                        age: 0,
                        maxAge: 0.7
                    });
                    break;
                }
            }

            // hit enemies
            if (playerShot.active) {
                if (isMakeItYourOwnMode) {
                    // Wave mode: check all wave enemies
                    for (let e of waveEnemies) {
                        if (!e.alive) continue;
                        if (dist2D(
                            playerShot.pos[0], playerShot.pos[2],
                            e.pos[0], e.pos[2]
                        ) < e.radius + bulletRadiusBoost * 0.75) {

                            playerShot.active = false;
                            e.alive = false;
                            enemiesRemainingInWave--;

                            score += 100 * currentWave;

                            explosions.push({
                                pos: vec3.fromValues(e.pos[0], 0.05, e.pos[2]),
                                age: 0,
                                maxAge: 0.7
                            });

                            playBeep(1000, 0.08, 0.3);
                            setTimeout(() => playBeep(1400, 0.08, 0.3), 90);

                            if (enemiesRemainingInWave <= 0) {
                                onEnemyKilledForWaveMode(); // handles wave clear / win
                            }
                            break;
                        }
                    }
                } else if (enemyAlive) {
                    // Normal single enemy
                    if (dist2D(
                        playerShot.pos[0], playerShot.pos[2],
                        enemyPos[0], enemyPos[2]
                    ) < enemyRadius + bulletRadiusBoost * 0.75) {

                        playerShot.active = false;
                        score += 100;

                        explosions.push({
                            pos: vec3.fromValues(enemyPos[0], 0.05, enemyPos[2]),
                            age: 0,
                            maxAge: 0.7
                        });

                        playBeep(1000, 0.08, 0.3);
                        setTimeout(() => playBeep(1400, 0.08, 0.3), 90);

                        onEnemyKilledForWaveMode();
                    }
                }
            }
        }
    }

    // ENEMY SHOT
    if (enemyShot.active) {
        const step = enemyShot.speed * dt;
        enemyShot.pos[0] += enemyShot.dir[0] * step;
        enemyShot.pos[2] += enemyShot.dir[2] * step;
        enemyShot.traveled += step;

        if (enemyShot.traveled > enemyShot.maxDist) {
            enemyShot.active = false;
        } else {
            // hit obstacles
            for (let obs of obstacles) {
                if (dist2D(
                    enemyShot.pos[0], enemyShot.pos[2],
                    obs.pos[0], obs.pos[2]
                ) <  obs.radius * 0.9 + bulletRadiusBoost) {
                    enemyShot.active = false;
                    explosions.push({
                        pos: vec3.clone(enemyShot.pos),
                        age: 0,
                        maxAge: 0.7
                    });
                    break;
                }
            }

            // hit player
            // hit player
			if (enemyShot.active && playerAlive &&
				playerInvulnTimer <= 0 && playerAbilityInvulnTimer <= 0) {

				if (dist2D(
					enemyShot.pos[0], enemyShot.pos[2],
					playerPos[0],      playerPos[2]
				) < playerRadius) {
					enemyShot.active = false;
					killPlayer();
					explosions.push({
						pos: vec3.fromValues(playerPos[0], 0.05, playerPos[2]),
						age: 0,
						maxAge: 0.7
					});
				}
			}

        }
    }
}

//xplosions automatically disappear after their lifetime
function updateExplosions(dt) {
	for (let ex of explosions) {
		ex.age += dt;
	}
	explosions = explosions.filter(ex => ex.age < ex.maxAge);
}

function updatePlayerRespawn(dt) {
    // handle respawn countdown
    if (!playerAlive) {
        playerRespawnTimer -= dt;
        if (playerRespawnTimer <= 0) {
            respawnPlayer();
        }
    }

    // spawn invuln: fade & no shooting
    if (playerInvulnTimer > 0) {
        playerInvulnTimer -= dt;
        if (playerInvulnTimer < 0) 
			playerInvulnTimer = 0;
    }

    // ability shield: full-opacity shield, but you can still shoot
    if (playerAbilityInvulnTimer > 0) {
        playerAbilityInvulnTimer -= dt;
        if (playerAbilityInvulnTimer < 0) 
			playerAbilityInvulnTimer = 0;
    }
}

//GAME LOOP
function updateGame(dt) {
    if (!gameStarted) {
        updateCameraFromPlayer();
        return;
    }

    // Fire cooldown for player
    if (playerFireCooldown > 0) {
        playerFireCooldown -= dt;
        if (playerFireCooldown < 0) 
			playerFireCooldown = 0;
    }

    radarBeepTimer += dt;
    if (radarBeepTimer >= RADAR_BEEP_PERIOD) {
        radarBeepTimer -= RADAR_BEEP_PERIOD;
        playBeep(1200, 0.05, 0.08);
    }

    updatePlayer(dt);

    if (isMakeItYourOwnMode) {
        updateWaveEnemies(dt);// move all enemies in wave
    } else {
        updateEnemy(dt);// single
    }

	if (isMakeItYourOwnMode && gameStarted) {
        if (waveIntroTimer > 0.0) {
            waveIntroTimer -= dt;
            if (waveIntroTimer < 0.0) {
                waveIntroTimer = 0.0;
            }
        }
    }

    updateShots(dt);
    updateExplosions(dt);
    updatePlayerRespawn(dt);
    updateCameraFromPlayer();
}

function setMaterial(mat, alphaOverride) {
	gl.uniform3fv(ambientULoc, mat.ambient);
	gl.uniform3fv(diffuseULoc, mat.diffuse);
	gl.uniform3fv(specularULoc, mat.specular);
	gl.uniform1f(shininessULoc, mat.n);
	gl.uniform1f(
		alphaULoc,
		(typeof alphaOverride === "number") ? alphaOverride : 1.0
	);
}


/***********************************************
 * ALL RENDER CALLS
 ***********************************************/


/************* RADAR VIEW *************/
function renderRadarView() {
    const canvas = gl.canvas;
    const margin = 10;

    let radarSize;
    let vx;
    let vy;

    if (isMakeItYourOwnMode) {
        // square minimap in bottom right corner for ! mode
        radarSize = Math.floor(Math.min(canvas.width, canvas.height) * 0.22);
        vx = canvas.width - radarSize - margin;
        vy = margin;
    } else {
        // original centered-top radar
        radarSize = Math.floor(canvas.height * 0.25);
        vx = Math.floor((canvas.width - radarSize) / 2);
        vy = canvas.height - radarSize - margin;
    }

    gl.viewport(vx, vy, radarSize, radarSize);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    const I = mat4.create();
    gl.uniformMatrix4fv(mMatrixULoc, false, I);
    gl.uniformMatrix4fv(pvmMatrixULoc, false, I);

    // unlit HUD mode
    gl.uniform1i(useLightingULoc, 0);
    gl.uniform1i(blendModeULoc, 0);

    // HUD should ignore depth
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    gl.disableVertexAttribArray(vNormAttribLoc);
    gl.disableVertexAttribArray(texCoordAttribLoc);

    // player forward direction on XZ plane
    let fx = Center[0] - Eye[0];
    let fz = Center[2] - Eye[2];
    const flen = Math.hypot(fx, fz);
    if (flen > 1e-5) {
        fx /= flen;
        fz /= flen;
    }

    
    if (isMakeItYourOwnMode) {
        // translucent background quad
        const quadVerts = [
            -1, -1, 0,
            1, -1, 0,
            1, 1, 0,
            -1, 1, 0
        ];
        const quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVerts), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosAttribLoc);

        // background 
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, hudTexture);

        gl.uniform1f(alphaULoc, 0.18);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        gl.disable(gl.BLEND);

        // reset alpha for lines/shapes
        gl.uniform1f(alphaULoc, 1.0);

        const radarWorldHalf = 20.0;

        function worldToMinimap(wx, wz) {
            // offset relative to player so player stays in center
            const dx = wx - playerPos[0];
            const dz = wz - playerPos[2];

            // normalize into [-1, 1] range
            let rx = dx / radarWorldHalf;
            let ry = -dz / radarWorldHalf;

            // clamp to edge of minimap
            rx = Math.max(-1.0, Math.min(1.0, rx));
            ry = Math.max(-1.0, Math.min(1.0, ry));

            return [rx, ry];
        }

        // draw square border
        const borderVerts = [
            -1, -1, 0,
            1, -1, 0,
            1, 1, 0,
            -1, 1, 0,
            -1, -1, 0
        ];
        const borderBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, borderBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(borderVerts), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosAttribLoc);
        gl.drawArrays(gl.LINE_STRIP, 0, 5);

        // player arrow in the center
        // forward direction for arrow
        const arrowLen = 0.15;
        const arrowWidth = 0.08;

        // player always at center (0,0) space
        const ax = 0;
        const ay = 0;

        // pointing in camera forward direction (fx, fz)
        const dirX = fx;
        const dirY = -fz; 

        // perpendicular for arrow width
        const perpX = -dirY;
        const perpY = dirX;

        const tipX = ax + dirX * arrowLen;
        const tipY = ay + dirY * arrowLen;
        const leftX = ax - dirX * 0.05 + perpX * arrowWidth;
        const leftY = ay - dirY * 0.05 + perpY * arrowWidth;
        const rightX = ax - dirX * 0.05 - perpX * arrowWidth;
        const rightY = ay - dirY * 0.05 - perpY * arrowWidth;

        const playerArrowVerts = [
            tipX,   tipY,   0,
            leftX,  leftY,  0,
            rightX, rightY, 0
        ];
        const playerBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, playerBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(playerArrowVerts), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosAttribLoc);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // enemy blips (all wave enemies) 
		for (let e of waveEnemies) {
			if (!e.alive) 
				continue;

			const [ex, ey] = worldToMinimap(e.pos[0], e.pos[2]);
			const dotHalf = 0.03;

			const dotVerts = [
				ex - dotHalf, ey - dotHalf, 0,
				ex + dotHalf, ey - dotHalf, 0,
				ex + dotHalf, ey + dotHalf, 0,
				ex - dotHalf, ey + dotHalf, 0,
				ex - dotHalf, ey - dotHalf, 0
			];
			const dotBuf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dotVerts), gl.STATIC_DRAW);
			gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(vPosAttribLoc);
			gl.drawArrays(gl.LINE_STRIP, 0, 5);
		}
    }

    // NORMAL MODE: original circular radar with FOV cone
    else {
        // Radar texture / color
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, radarTexture);

        function worldToRadar(wx, wz) {
            const dx = wx - playerPos[0];
            const dz = wz - playerPos[2];
            const dist = Math.hypot(dx, dz);
            if (dist < 1e-5) {
                return [0, 0];
            }

            const dirX = dx / dist;
            const dirZ = dz / dist;

            const maxWorldDist = 3.0;
            const radarDist = Math.min(dist / maxWorldDist, 1.0) * 0.85;

            let rx = -dirX * radarDist;
            let ry = dirZ * radarDist;

            return [rx, ry];
        }

        // circular border
        const segs = 48;
        const circleVerts = [];
        const circleRadius = 0.9;
        for (let i = 0; i <= segs; i++) {
            const t = (i / segs) * 2 * Math.PI;
            circleVerts.push(Math.cos(t) * circleRadius, Math.sin(t) * circleRadius, 0.0);
        }
        const circleBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVerts), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosAttribLoc);
        gl.drawArrays(gl.LINE_STRIP, 0, segs + 1);

        // forward FOV cone
        const radarFwdX = -fx;
        const radarFwdY =  fz;
        const baseAngle = Math.atan2(radarFwdY, radarFwdX);
        const halfFov = Math.PI / 4;
        const angL = baseAngle - halfFov;
        const angR = baseAngle + halfFov;
        const coneR = circleRadius;

        const rays = [
            0, 0, 0, Math.cos(angL) * coneR, Math.sin(angL) * coneR, 0,
            0, 0, 0, Math.cos(angR) * coneR, Math.sin(angR) * coneR, 0
        ];
        const rayBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, rayBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rays), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, 4);

        // enemy blip
        if (enemyAlive) {
            const [rx, ry] = worldToRadar(enemyPos[0], enemyPos[2]);
            const dotSize = 0.04;

            const dotVerts = [
                rx - dotSize, ry - dotSize, 0,
                rx + dotSize, ry - dotSize, 0,
                rx + dotSize, ry + dotSize, 0,
                rx - dotSize, ry + dotSize, 0,
                rx - dotSize, ry - dotSize, 0
            ];
            const dotBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dotVerts), gl.STATIC_DRAW);
            gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.LINE_STRIP, 0, 5);
        }
    }
    gl.enableVertexAttribArray(vNormAttribLoc);
    gl.enableVertexAttribArray(texCoordAttribLoc);

    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1f(alphaULoc, 1.0);
}

// Crosshair is drawn along the exact same direction that bullets travel.
function renderCrosshair3D(pvMatrix) {
	if (!crosshair3DBuffer) {
		return;
	}

	// figure out which way the camera is looking in 3D space
	const camDir = vec3.fromValues(
		Center[0] - Eye[0],
		Center[1] - Eye[1],
		Center[2] - Eye[2]
	);
	vec3.normalize(camDir, camDir);

	// get the direction the player is actually aiming their shots
	const aimDir = getAimDirection();

	// put the crosshair a little bit in front of the tank on the floor
	const crossDistance = 1.0; // how far ahead from the player
	const crossHeight = 0.05; // tiny bit above the ground so it does not clip
	const crossPos = vec3.fromValues(
		playerPos[0] + aimDir[0] * crossDistance,
		crossHeight,
		playerPos[2] + aimDir[2] * crossDistance
	);

	// make a little square that always faces the camera like a sticker
	const worldUp = vec3.fromValues(0, 1, 0);
	const right = vec3.create();
	vec3.cross(right, camDir, worldUp);
	if (vec3.length(right) < 1e-3) {
		vec3.set(right, 1, 0, 0);
	} else {
		vec3.normalize(right, right);
	}
	const up = vec3.create();
	vec3.cross(up, right, camDir);
	vec3.normalize(up, up);

	// how big the crosshair 
	const size = 0.15;

	// start with an identity matrix and move it to the crosshair position
	const mMatrix = mat4.create();
	mat4.identity(mMatrix);
	mat4.translate(mMatrix, mMatrix, crossPos);

	// fill in the rotation part of the matrix using right and up
	mMatrix[0] = right[0] * size;
	mMatrix[1] = right[1] * size;
	mMatrix[2] = right[2] * size;

	mMatrix[4] = up[0] * size;
	mMatrix[5] = up[1] * size;
	mMatrix[6] = up[2] * size;

	// forward points toward the camera direction so it faces us
	mMatrix[8]  = camDir[0];
	mMatrix[9]  = camDir[1];
	mMatrix[10] = camDir[2];

	// combine projection and view with our model matrix
	const pvmMatrix = mat4.create();
	mat4.multiply(pvmMatrix, pvMatrix, mMatrix);

	// send the matrices to the shader
	gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix);
	gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix);

	// super simple white crosshair not affected by lighting
	gl.uniform1i(useLightingULoc, 0);
	gl.uniform1i(blendModeULoc, 0);
	gl.uniform3fv(ambientULoc, [1, 1, 1]);
	gl.uniform3fv(diffuseULoc, [1, 1, 1]);
	gl.uniform3fv(specularULoc, [0, 0, 0]);
	gl.uniform1f(shininessULoc, 1.0);
	gl.uniform1f(alphaULoc, 1.0);

	gl.bindBuffer(gl.ARRAY_BUFFER, crosshair3DBuffer);
	gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, hudTexture);

	// draw on top of everything so the crosshair is always visible
	const depthWasEnabled = gl.isEnabled(gl.DEPTH_TEST);
	if (depthWasEnabled) {
		gl.disable(gl.DEPTH_TEST);
	}

	gl.drawArrays(gl.LINES, 0, crosshair3DVertexCount);

	// put depth testing back the way it was
	if (depthWasEnabled) {
		gl.enable(gl.DEPTH_TEST);
	}

	// restore the old lighting and blend settings so the rest of the scene looks normal
	gl.uniform1i(useLightingULoc, gUseLighting);
	gl.uniform1i(blendModeULoc, gBlendMode);
}


/**
 * Renders a 3D mesh model at a given position and size using the camera projection view matrix
 * Lets you optionally override its alpha and color for neon or black core looks
 */
function renderMesh(model, pos, scale, pvMatrix, alphaOverride, overrideColor) {
    if (!model) {
        return;
    }

    const mMatrix   = mat4.create();
    const pvmMatrix = mat4.create();

    // build the model matrix so we can place and size the mesh in the world
    mat4.translate(mMatrix, mMatrix, pos);
    if (scale) {
        mat4.scale(mMatrix, mMatrix, scale);
    }

    // combine projection view with the model matrix so it shows up in the right place on screen
    mat4.multiply(pvmMatrix, pvMatrix, mMatrix);

    // send both matrices to the shader
    gl.uniformMatrix4fv(mMatrixULoc,  false, mMatrix);
    gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix);

    //MATERIAL AND COLOR
    if (overrideColor) {
        // if we pass in a color we use that instead of the models material color
        const c = overrideColor; 

        // set ambient and diffuse to the same color so it glows nicely
        gl.uniform3fv(ambientULoc, c);
        gl.uniform3fv(diffuseULoc, c);

        // check if we asked for pure black for the core
        const isBlackCore = (c[0] === 0.0 && c[1] === 0.0 && c[2] === 0.0);

        if (isBlackCore) {
            // for black core we want barely any shiny highlight so it feels flat and dark
            gl.uniform3fv(specularULoc, [0.2, 0.2, 0.2]);
            gl.uniform1f(shininessULoc, 4.0);
        } else {
            // for neon colors we give a soft specular so it looks a bit shiny
            gl.uniform3fv(specularULoc, [0.4, 0.4, 0.4]);
            gl.uniform1f(shininessULoc, 24.0);
        }

        // use the alpha override if we have one otherwise fully solid
        gl.uniform1f(
            alphaULoc,
            (typeof alphaOverride === "number") ? alphaOverride : 1.0
        );
    } else {
        // if no override color just use the material that came with the model
        setMaterial(model.material, alphaOverride);
    }

    // ATTRIBUTES
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.vertexAttribPointer(vNormAttribLoc, 3, gl.FLOAT, false, 0, 0);

    // if the model has texture coordinates hook those up too
    if (model.texBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, model.texBuffer);
        gl.vertexAttribPointer(texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // TEXTURE
    gl.activeTexture(gl.TEXTURE0);
    const tex = model.texture || hudTexture;
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // DRAW 
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.drawElements(gl.TRIANGLES, model.indexCount, gl.UNSIGNED_SHORT, 0);
}

/* 
 * Renders a glowing neon outline around a 3D mesh
 * Uses a slightly bigger copy of the model and only draws its back faces
 * so it looks like a bright halo around the solid core
 */
function renderNeonOutline(model, pos, outlineScale, pvMatrix, color, alpha) {
    if (!model) 
        return;

    // use given alpha or default to a nice see through glow
    const a = (typeof alpha === "number") ? alpha : 0.7;

    // we only want to draw the BACK faces of a slightly bigger mesh
    // with depth test on this makes a cool halo around the solid object
    const cullWasEnabled = gl.isEnabled(gl.CULL_FACE);
    
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);    // throw away front faces keep the back ones
    gl.enable(gl.DEPTH_TEST); // still respect depth so it sits in the world correctly

    // draw the mesh again but bigger and with the neon color
    renderMesh(
        model,
        pos,
        outlineScale,
        pvMatrix,
        a,
        color
    );

    // put culling settings back the way they were before
    gl.cullFace(gl.BACK); 
    if (!cullWasEnabled) {
        gl.disable(gl.CULL_FACE);
    }
}

/**
 * Draws a detailed 3D tank made of many little parts like body and turret
 * Uses different part lists for the player tank and the enemy tank
 * Also gives the tank a soft glow boost in ! mode to make it pop more
 */
function renderDetailedTank(isPlayerTank, worldPosition, heading, alphaOverride, projectionViewMatrix) {
    // pick which set of parts to use based on if this is a player tank or an enemy tank
	var parts = isPlayerTank
		? detailedPlayerTankParts
		: detailedEnemyTankParts;

    // if there are no parts then there is nothing to draw
	if (!parts || parts.length === 0) {
		return;
	}

	// figure out the center position of the whole tank
	// we lift it up by half the body height so the bottom sits near y = 0
	var tankWorldPosition = vec3.fromValues(
		worldPosition[0],
		detailedTankBodyHalfHeight,
		worldPosition[2]
	);

    // go through each piece that makes up the tank and draw them one by one
	for (var index = 0; index < parts.length; index++) {
		var part = parts[index];

		var modelMatrix = mat4.create();
		var projectionViewModelMatrix = mat4.create();

		// 1 move the part so it starts at the tank center in the world
		mat4.translate(modelMatrix, modelMatrix, tankWorldPosition);

		// 2 rotate the whole tank around the y axis so it faces the right direction
		mat4.rotateY(modelMatrix, modelMatrix, heading);

		// 3 move to this part’s local spot on the tank (like turret or wheels)
		mat4.translate(modelMatrix, modelMatrix, part.localPosition);

		// 4 scale the part so it has the correct size for this tank
		if (part.localScale) {
			mat4.scale(modelMatrix, modelMatrix, part.localScale);
		}

		// 5 combine with the camera projection and view so it shows in the right place on screen
		mat4.multiply(projectionViewModelMatrix, projectionViewMatrix, modelMatrix);

		gl.uniformMatrix4fv(mMatrixULoc, false, modelMatrix);
		gl.uniformMatrix4fv(pvmMatrixULoc, false, projectionViewModelMatrix);

		// in ! mode we give the tank materials a little extra glow and shine
		if (isMakeItYourOwnMode) {
			// grab the base material from the model
			let m = part.model.material;

			// make a boosted copy so we do not mess up the original material forever
			let boosted = {
				ambient: [
					Math.min(m.ambient[0] + 0.10, 1.0),
					Math.min(m.ambient[1] + 0.10, 1.0),
					Math.min(m.ambient[2] + 0.10, 1.0)
				],
				diffuse: [
					Math.min(m.diffuse[0] * 1.15, 1.0),
					Math.min(m.diffuse[1] * 1.15, 1.0),
					Math.min(m.diffuse[2] * 1.15, 1.0)
				],
				specular: [0.9, 0.9, 0.9], 
				n: 24   
			};
			setMaterial(boosted, alphaOverride);
		} else {
			// in normal mode just use the default material of the part
			setMaterial(part.model.material, alphaOverride);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, part.model.vertexBuffer);
		gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, part.model.normalBuffer);
		gl.vertexAttribPointer(vNormAttribLoc, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, part.model.texBuffer);
		gl.vertexAttribPointer(texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);

		gl.activeTexture(gl.TEXTURE0);

        // choose which texture to use
        // first try the part’s own texture
        // if that is missing use the main tank texture (player or enemy)
        // if that is still missing fall back to the white HUD texture
        let tex = part.model.texture;

        if (!tex) {
            tex = isPlayerTank ? playerTankTexture : enemyTankTexture;
        }
        if (!tex) {
            tex = hudTexture;
        }

        gl.bindTexture(gl.TEXTURE_2D, tex);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.model.indexBuffer);
		gl.drawElements(gl.TRIANGLES, part.model.indexCount, gl.UNSIGNED_SHORT, 0);
	}
}

/**
 * Draws the player’s bullet in 3D using the camera projection view matrix
 */
function drawBullets(pvMatrix) {
    // turn off lighting so bullets stay a flat bright color
    gl.uniform1i(useLightingULoc, 0); 

    // only draw the bullet if it is currently active and flying around
    if (playerShot.active) {
        let m = mat4.create();
        mat4.translate(m, m, playerShot.pos);
        mat4.scale(m, m, [0.03, 0.03, 0.3]); // thin long bullet

        // combine with camera projection view so it appears in the right spot on screen
        let pvm = mat4.create();
        mat4.multiply(pvm, pvMatrix, m);

        gl.uniformMatrix4fv(mMatrixULoc, false, m);
        gl.uniformMatrix4fv(pvmMatrixULoc, false, pvm);

        // fully solid bullet no fade
        gl.uniform1f(alphaULoc, 1.0);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.vertexBuffer);
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.normalBuffer);
        gl.vertexAttribPointer(vNormAttribLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.texBuffer);
        gl.vertexAttribPointer(texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, hudTexture);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.indexBuffer);
        gl.drawElements(gl.TRIANGLES, cubeModel.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // turn lighting back on so the rest of the scene looks normal again
    gl.uniform1i(useLightingULoc, 1); 
}


/**
 * Main render loop for the whole game
 * Updates the game logic then draws ground mountains obstacles tanks bullets explosions crosshair radar and HUD
 * Handles both normal mode and the neon ! mode visuals
 */
function renderModels(timestamp) {
    // set up lastFrameTime the first time this runs
    if (!lastFrameTime) {
        lastFrameTime = timestamp || 0;
    }
    var now = timestamp || 0;
    var dt = (now - lastFrameTime) / 1000.0; // seconds since last frame
    lastFrameTime = now;

    // update all game logic movement timers collisions etc
    updateGame(dt);

    // schedule the next frame so the game keeps running
    window.requestAnimationFrame(renderModels);

    // pick sky color based on which mode we are in
    if (isMakeItYourOwnMode) {
        // darker neon night sky
        gl.clearColor(0.0196, 0.0196, 0.102, 1.0);
    } else {
        // bright blue daytime sky
        gl.clearColor(0.02, 0.52, 0.78, 1.0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // whole screen viewport for the 3D scene
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // camera setup matrices
    var pMatrix = mat4.create();
    var vMatrix = mat4.create();
    var pvMatrix = mat4.create();

    
	
	var aspect = gl.canvas.width / gl.canvas.height;
    mat4.perspective(pMatrix, 0.5 * Math.PI, aspect, 0.1, 60.0);
    mat4.lookAt(vMatrix, Eye, Center, Up);
    mat4.multiply(pvMatrix, pMatrix, vMatrix);

    gl.uniform3fv(eyePositionULoc, Eye);
    gl.uniform1i(useLightingULoc, gUseLighting);
    gl.uniform1i(blendModeULoc, gBlendMode);

    // GROUN
    // draw the floor of the battlefield
    drawGround(pvMatrix);
    gl.uniform1f(tileScaleULoc, 1.0);

    // HORIZON / MOUNTAINS
    // make sure we have mountain data to draw
    if (mountains.length === 0) {
        setupMountains();
    }

    if (!isMakeItYourOwnMode) {
        // NORMAL MODE → draw full 3D mountains
        for (var mi = 0; mi < mountains.length; mi++) {
            var m = mountains[mi];
            if (!m || !m.model) 
				continue;
            renderMesh(m.model, m.pos, m.scale, pvMatrix, 1.0);
        }
    } else {
        // ! MODE → turn the mountains into a neon pink sunset band on the horizon
        for (var mi = 0; mi < mountains.length; mi++) {
            var m = mountains[mi];
            if (!m || !m.model) 
				continue;

            var mdl = m.model;
            var savedMat = mdl.material || {};

            // hot pink style material for the band
            mdl.material = {
                ambient:  [0.6, 0.0, 0.4],
                diffuse:  [0.5, 0.3, 0.8],
                specular: [0.0, 0.0, 0.0],
                n: (savedMat.n || savedMat.shininess || 8.0)
            };

            // same ring but squished in height so it looks like a thin glowing strip
            var bandPos = vec3.fromValues(
                m.pos[0],
                m.pos[1] + 0.05,   // float a little above the ground
                m.pos[2]
            );

            var bandScale = [
                m.scale[0],      
                m.scale[1] * 0.08, 
                m.scale[2]
            ];

            renderMesh(mdl, bandPos, bandScale, pvMatrix, 1.0);

            // put the old material back for other modes
            mdl.material = savedMat;
        }
    }

    // OBSTACLES
    // draw all cubes pyramids hemispheres etc
    for (var oi = 0; oi < obstacles.length; oi++) {
        var obs = obstacles[oi];
        if (!obs || !obs.model) {
            continue;
        }

        var pos = vec3.fromValues(obs.pos[0], obs.pos[1], obs.pos[2]);

        if (!isMakeItYourOwnMode) {
            // NORMAL MODE: use the obstacle’s own material colors
            renderMesh(
                obs.model,
                pos,
                obs.scale,
                pvMatrix,
                1.0,
                null
            );
        } else {
            // ! MODE: black core plus neon outline arcade vibe

            // black inner shape
            renderMesh(
                obs.model,
                pos,
                obs.scale,
                pvMatrix,
                1.0,
                [0.0, 0.0, 0.0]  
            );

            // pick neon outline color based on obstacle type
            var neonColor;
            switch (obs.type) {
                case "cube":
                    neonColor = [0.0, 0.9, 0.9];   
                    break;
                case "pyramid":
                    neonColor = [0.0, 1.0, 0.4]; 
                    break;
                case "hemi":
                    neonColor = [1.0, 0.5, 0.5]; 
                    break;
                default:
                    neonColor = [0.0, 0.9, 0.9]; 
                    break;
            }

            // slightly bigger size for the outline halo
            var outlineMul = 1.05;
            var outlineScale = [
                obs.scale[0] * outlineMul,
                obs.scale[1] * outlineMul,
                obs.scale[2] * outlineMul
            ];

            // draw the neon edge around the black shape
            renderNeonOutline(
                obs.model,
                pos,
                outlineScale,
                pvMatrix,
                neonColor,
                0.8
            );
        }
    }

    // PLAYER TANK
    var playerAlpha = 1.0;

    if (!playerAlive && playerRespawnTimer > 0) {
        // during death to respawn time the tank is a ghost
        playerAlpha = 0.35;
    } else if (playerInvulnTimer > 0) {
        // fade in the tank as invulnerability wears off
        var invulnRatio = playerInvulnTimer / 3.0;
        playerAlpha = 0.25 + 0.75 * (1.0 - invulnRatio);
    }

    var playerWorldPosition = vec3.fromValues(playerPos[0], 0.0, playerPos[2]);

    if (isMakeItYourOwnMode && detailedPlayerTankParts.length > 0) {
        renderDetailedTank(true, playerWorldPosition, playerHeading, playerAlpha, pvMatrix);
    } else if (playerTankModel) {
        // fallback simple tank box
        var simplePlayerPosition = vec3.fromValues(playerPos[0], 0.06, playerPos[2]);
        renderMesh(playerTankModel, simplePlayerPosition, [1, 1, 1], pvMatrix, playerAlpha);
    }

    // ABILITY SHIELD VISUAL 
    if (playerAbilityInvulnTimer > 0 && renderModels.explosionModel && playerAlive) {

        const shieldPos = vec3.fromValues(playerPos[0], 0.06, playerPos[2]);

        const shieldBase  = 0.20;
        const shieldScale = shieldBase / 0.15;

        // save the original material so we can put it back later
        const savedMat = renderModels.explosionModel.material;

        // blue bubble shield material
        renderModels.explosionModel.material = {
            ambient: [0.0, 0.25, 0.55],
            diffuse: [0.2, 0.55, 1.0],
            specular: [0.6, 0.8, 1.0],
            shininess: 32.0
        };

        // enable blending so the shield is see through
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false); // do not write depth so it does not block other objects

        renderMesh(
            renderModels.explosionModel,
            shieldPos,
            [shieldScale, shieldScale, shieldScale],
            pvMatrix,
            0.18 
        );

        gl.depthMask(true);
        gl.disable(gl.BLEND);

        // put the old material back
        renderModels.explosionModel.material = savedMat;
    }

    // ENEMY TANKS
    if (isMakeItYourOwnMode) {
        // wave mode can have many enemy tanks at once
        for (let e of waveEnemies) {
            if (!e.alive) 
				continue;

            var enemyWorldPosition = vec3.fromValues(e.pos[0], 0.0, e.pos[2]);

            if (detailedEnemyTankParts.length > 0) {
                renderDetailedTank(false, enemyWorldPosition, e.heading || 0.0, 1.0, pvMatrix);
            } else if (enemyTankModel) {
                // simple box enemy
                var simpleEnemyPosition = vec3.fromValues(e.pos[0], 0.06, e.pos[2]);
                renderMesh(enemyTankModel, simpleEnemyPosition, [1, 1, 1], pvMatrix, 1.0);
            }
        }
    } else if (enemyAlive) {
        // normal mode uses just one enemy tank
        if (enemyTankModel) {
            var simpleEnemyPosition = vec3.fromValues(enemyPos[0], 0.06, enemyPos[2]);
            renderMesh(enemyTankModel, simpleEnemyPosition, [1, 1, 1], pvMatrix, 1.0);
        }
    }


    // BULLETS AND EXPLOSIONS 
    // player bullets in fancy model style based on multi shot level
    if (playerShot.active && renderModels.playerShotModel) {
        var basePosition = vec3.fromValues(playerShot.pos[0], 0.05, playerShot.pos[2]);

        if (playerMultiShotLevel <= 0) {
            // simple single bullet
            renderMesh(renderModels.playerShotModel, basePosition, [1, 1, 1], pvMatrix, 1.0);
        } else {
            // multiple bullets spread sideways
            var direction = vec3.fromValues(playerShot.dir[0], 0, playerShot.dir[2]);
            if (vec3.length(direction) < 1e-3) {
                vec3.set(direction, 0, 0, 1);
            } else {
                vec3.normalize(direction, direction);
            }
            var perpendicular = vec3.fromValues(-direction[2], 0, direction[0]);
            var spreadAmount = 0.04;

            if (playerMultiShotLevel === 1) {
                // two bullets side by side
                var leftPosition = vec3.clone(basePosition);
                var rightPosition = vec3.clone(basePosition);
                leftPosition[0] += perpendicular[0] * spreadAmount;
                leftPosition[2] += perpendicular[2] * spreadAmount;
                rightPosition[0] -= perpendicular[0] * spreadAmount;
                rightPosition[2] -= perpendicular[2] * spreadAmount;

                renderMesh(renderModels.playerShotModel, leftPosition, [1, 1, 1], pvMatrix, 1.0);
                renderMesh(renderModels.playerShotModel, rightPosition, [1, 1, 1], pvMatrix, 1.0);
            } else {
                // three bullets for higher levels left center right
                var centerPosition = basePosition;
                var leftPosition = vec3.clone(basePosition);
                var rightPosition = vec3.clone(basePosition);
                leftPosition[0] += perpendicular[0] * spreadAmount;
                leftPosition[2] += perpendicular[2] * spreadAmount;
                rightPosition[0] -= perpendicular[0] * spreadAmount;
                rightPosition[2] -= perpendicular[2] * spreadAmount;

                renderMesh(renderModels.playerShotModel, leftPosition, [1, 1, 1], pvMatrix, 1.0);
                renderMesh(renderModels.playerShotModel, centerPosition, [1, 1, 1], pvMatrix, 1.0);
                renderMesh(renderModels.playerShotModel, rightPosition, [1, 1, 1], pvMatrix, 1.0);
            }
        }
    }

    // enemy bullet model if active
    if (enemyShot.active && renderModels.enemyShotModel) {
        var enemyShotPosition = vec3.fromValues(enemyShot.pos[0], 0.05, enemyShot.pos[2]);
        renderMesh(renderModels.enemyShotModel, enemyShotPosition, [1, 1, 1], pvMatrix, 1.0);
    }

    // explosion spheres that grow and fade out over time
    for (i = 0; i < explosions.length; i++) {
        var explosion = explosions[i];
        var explosionProgress = explosion.age / explosion.maxAge;
        var explosionSize = 0.10 + 0.10 * explosionProgress;
        var explosionAlpha = 1.0 - explosionProgress;
        var explosionPosition = vec3.fromValues(explosion.pos[0], 0.05, explosion.pos[2]);

        if (renderModels.explosionModel) {
            renderMesh(
                renderModels.explosionModel,
                explosionPosition,
                [explosionSize / 0.15, explosionSize / 0.15, explosionSize / 0.15],
                pvMatrix,
                explosionAlpha
            );
        }
    }

    renderCrosshair3D(pvMatrix);
    renderRadarView();
    renderHUD();
}



/************* MAIN *************/
function main() {
	setupWebGL();

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	setupShaders();
	setupHudTexture();
	
	setupTankModels();
	setupProjectileModels();
	setupBattlefield();
	setUpTankTextures();

	setupObstacles();
	setupMountains();
	setupCrosshair3D();
	resetGame();
	updateCameraFromPlayer();

	window.requestAnimationFrame(renderModels);
}