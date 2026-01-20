// DatGUI controls.
var guiControls = null;

// Hold OSV controls.
var displayControls = {};
var cameraControls = {};
var observerControls = {};

/**
 * Create GUI controls.
 */
function createControls()
{ 
    guiControls = new function()
    {
        this.enableGrid = true;
        this.enableConst = false;
        this.enableStars = true;
        this.enableGalaxy = true;
        this.enableTampere = false;
        this.enableVisibility = true;
        this.enableTextures = true;
        this.gridLonResolution = 30;
        this.gridLatResolution = 30;        
        this.colorGrid = [80, 80, 80];
        this.betaLon = 0;
        this.betaLat = 0;
        this.beta = 0;
        this.betaLock = true;

        this.GitHub = function() {
            window.open("https://github.com/vsr83/AberrationTest", "_blank").focus();
        };
        this.lon = 90.0;
        this.lat = 0.0;

        this.upLon = 0.0;
        this.upLat = 90.0;
        this.fov = 50;
    }

    gui = new dat.GUI();

    const observerFolder = gui.addFolder('Observer');
    observerFolder.add(guiControls, 'beta', 0, 0.999, 0.001).name('Beta Parameter');
    observerControls.betaLat = observerFolder.add(guiControls, 'betaLat', -90, 90, 0.1).name('Latitude');
    observerControls.betaLon = observerFolder.add(guiControls, 'betaLon', -180, 180, 0.1).name('Longitude');
    observerControls.betaLock = observerFolder.add(guiControls, 'betaLock').name('Lock to Camera');

    const displayFolder = gui.addFolder('Display');
    displayControls.enableGrid = displayFolder.add(guiControls, 'enableGrid').name('Grid Lines');
    displayControls.enableStars = displayFolder.add(guiControls, 'enableStars').name('Stars');
    displayControls.enableConst = displayFolder.add(guiControls, 'enableConst').name('Constellations');
    displayControls.enableGalaxy = displayFolder.add(guiControls, 'enableGalaxy').name('Galaxy');
    displayControls.enableTampere = displayFolder.add(guiControls, 'enableTampere').name('Tampere');

    const cameraFolder = gui.addFolder('Camera');

    cameraFolder.add(guiControls, 'fov', 1, 180, 1).name('Field of View');
    cameraControls.lon = cameraFolder.add(guiControls, 'lon', -180, 180, 0.1).name('Longitude');
    cameraControls.lat = cameraFolder.add(guiControls, 'lat', -180, 180, 0.1).name('Latitude');
    cameraFolder.add(guiControls, 'upLon', -180, 180, 1).name('Longitude Up');
    cameraFolder.add(guiControls, 'upLat', -90, 90, 1).name('Latitude Up');

    gui.add(guiControls, 'GitHub');
}
 
