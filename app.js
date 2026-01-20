"use strict";

var gl = null;
var sphereShaders = null;
var lineShaders = null;

// Semi-major and semi-minor axes of the WGS84 ellipsoid.
const a = 6378.1370;
const b = 6356.75231414;

createControls();

let rotZToLon = (rotZ) => {return (-90 - rotZ);}
let rotXToLat = (rotX) => {return (90 + rotX);}

// Rotation.
var rotX = MathUtils.deg2Rad(-90);
var rotY = MathUtils.deg2Rad(0);
var rotZ = MathUtils.deg2Rad(0);

// JS canvas
var canvasJs = document.querySelector("#canvasJs");
var contextJs = canvasJs.getContext("2d");

gl = canvas.getContext("webgl2");
if (!gl) 
{
    console.log("Failed to initialize GL.");
}
sphereShaders = new SphereShaders(gl, 50, 50, a*15, b*15, 15, 15);
sphereShaders.init("textures/grid.png", "textures/galaxy.jpg", "textures/constellations.png",
    "textures/stars.jpg", "textures/tampere.jpg"
);
//sphereShaders.init("textures/grid.png", "textures/tampere.png");

lineShaders = new LineShaders(gl);
lineShaders.init();

requestAnimationFrame(drawScene);

// Draw the scene.
function drawScene(time) 
{
    if (sphereShaders.numTextures < 2)
    {
        requestAnimationFrame(drawScene);
        return;
    }

    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    gl.useProgram(sphereShaders.program);


    // Clear the canvas
    gl.clearColor(0, 0, 0, 255);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    contextJs.clearRect(0, 0, canvasJs.width, canvasJs.height);

    // Handle screen size updates.
    resizeCanvasToDisplaySize(gl.canvas);
    resizeCanvasToDisplaySize(canvasJs);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const matrix = createViewMatrix();
    sphereShaders.draw(matrix, guiControls.betaLon - 180, guiControls.betaLat, guiControls.beta, displayControls.enableGrid.getValue(),
        displayControls.enableGalaxy.getValue(), displayControls.enableStars.getValue(),
        displayControls.enableConst.getValue(), displayControls.enableTampere.getValue());

    // Call drawScene again next frame
    requestAnimationFrame(drawScene);

    drawing = false;
}

/**
 * Create view matrix taking into account the rotation.
 * 
 * @returns The view matrix.
 */
function createViewMatrix()
{
    // Compute the projection matrix.
    const fieldOfViewRadians = MathUtils.deg2Rad(guiControls.fov);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zFar = 1000000;
    const zNear = 1000;//(distance - b) / 2;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Camera position in the clip space.
    const cameraPosition = [0, 0, 1];
    const up = [0, 1, 0];
    up[0] = MathUtils.cosd(guiControls.upLat) * MathUtils.cosd(guiControls.upLon);
    up[2] = MathUtils.cosd(guiControls.upLat) * MathUtils.sind(guiControls.upLon);
    up[1] = MathUtils.sind(guiControls.upLat);

    const target = [0, 0, 0];

    // Compute the camera's matrix using look at.
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    rotZ = MathUtils.deg2Rad(-90 - guiControls.lon);
    if (canvasJs.onmousemove == null)
    {
        rotX = MathUtils.deg2Rad(-90 + guiControls.lat);
    }

    // Rotate view projection matrix to take into account rotation to target coordinates.
    var matrix = m4.xRotate(viewProjectionMatrix, rotX);
    matrix = m4.yRotate(matrix, rotY);
    matrix = m4.zRotate(matrix, rotZ);

    if (observerControls.betaLock.getValue()) {
        observerControls.betaLat.setValue(cameraControls.lat.getValue());
        observerControls.betaLon.setValue(cameraControls.lon.getValue());
    } 

    return matrix;
}
