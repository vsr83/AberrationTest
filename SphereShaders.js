/**
 * Class implementing the shaders for drawing of ellipsoids.
 */
class SphereShaders
{
    /**
     * Constructor.
     * 
     * @param {WebGLRenderingContext} gl
     *      The WebGL rendering context to use.
     * @param {*} nLon
     *      Number of longitude divisions.
     * @param {*} nLat 
     *      Number of latitude divisions.
     * @param {*} a 
     *      Equatorial radius.
     * @param {*} b
     *      Polar radius.
     * @param {*} lonGridStep
     *      Longitude grid step.
     * @param {*} latGridStep
     *      Latitude grid step.
     */
    constructor(gl, nLon, nLat, a, b, lonGridStep, latGridStep)
    {
        this.gl = gl;
        this.a = a;
        this.b = b;
        this.nLat = nLat;
        this.nLon = nLon;
        this.lonGridStep = lonGridStep;
        this.latGridStep = latGridStep;

        this.colorGrid = [80, 80, 80];
        this.colorMap = [80, 80, 127];

        this.vertShaderSphere = `#version 300 es
        // an attribute is an input (in) to a vertex shader.
        // It will receive data from a buffer
        in vec4 a_position;
        in vec2 a_texcoord;
        
        // A matrix to transform the positions by
        uniform mat4 u_matrix;

        // a varying to pass the texture coordinates to the fragment shader
        out vec2 v_texcoord;
        
        // all shaders have a main function
        void main() 
        {
            // Multiply the position by the matrix.
            gl_Position = u_matrix * a_position;
        
            // Pass the texcoord to the fragment shader.
            v_texcoord = a_texcoord;
        }
        `;
        
        this.fragShaderSphere = `#version 300 es
        
        precision highp float;
        #define PI 3.1415926538
        
        // Passed in from the vertex shader.
        in vec2 v_texcoord;
        
        // The texture.
        uniform sampler2D texture_grid;
        uniform sampler2D texture_galaxy;
        uniform sampler2D texture_const;
        uniform sampler2D texture_stars;
        uniform sampler2D texture_tampere;

        uniform float beta_x;
        uniform float beta_y;
        uniform float beta_z;

        uniform bool u_draw_grid;
        uniform bool u_draw_galaxy;
        uniform bool u_draw_stars;
        uniform bool u_draw_const;
        uniform bool u_draw_tampere;

        // we need to declare an output for the fragment shader
        out vec4 outColor;
                
        void main() 
        {
            vec3 beta_vec = vec3(beta_x, beta_y, beta_z);

            float beta = length(beta_vec);
            float gamma = 1.0 / sqrt(1.0 - beta * beta);

            float phi = v_texcoord.x * 2.0 * PI;
            float theta = (v_texcoord.y - 0.5) * PI;

            // Uncorrected direction vector.
            vec3 pu = vec3(cos(theta) * cos(phi), cos(theta) * sin(phi), sin(theta));

            float pu_beta_dot = dot(pu, beta_vec);

            // Corrected direction vector.
            vec3 su = 1.0 / (gamma * (1.0 + pu_beta_dot)) * (pu + gamma * beta_vec * 
                (1.0 + pu_beta_dot * gamma / (gamma + 1.0)));

            vec2 coord = vec2(1.0 - atan(su.y, su.x) / PI / 2.0, 0.5 + asin(su.z) / PI);

            if (u_draw_grid) {
                outColor = outColor + texture(texture_grid, coord);
            }
            if (u_draw_galaxy) {
                outColor = outColor + texture(texture_galaxy, coord);
            }
            if (u_draw_const) {
                outColor = outColor + texture(texture_const, coord) * 0.2;
            }
            if (u_draw_stars) {
                outColor = outColor + texture(texture_stars, coord);
            }
            if (u_draw_tampere) {
                outColor = outColor + texture(texture_tampere, coord);
            }
        }
        `;

        this.vertShaderGrid = `#version 300 es
            // an attribute is an input (in) to a vertex shader.
            // It will receive data from a buffer
            in vec4 a_position;
            in vec4 a_color;

            // A matrix to transform the positions by
            uniform mat4 u_matrix;

            // a varying the color to the fragment shader
            out vec4 v_color;

            // all shaders have a main function
            void main() 
            {
                // Multiply the position by the matrix.
                gl_Position = u_matrix * a_position;

                // Pass the color to the fragment shader.
                v_color = a_color;
            }
            `;

        this.fragShaderGrid = `#version 300 es
            precision highp float;

            // the varied color passed from the vertex shader
            in vec4 v_color;

            // we need to declare an output for the fragment shader
            out vec4 outColor;

            void main() 
            {
                outColor = v_color;
            }
            `;
    }

    /**
     * Initialize shaders, buffers and textures.
     * 
     * @param {String} srcTextureGrid
     *      URL of the texture for the grid. 
     * @param {String} srcTextureSphere 
     *      URL of the texture for the sphere.
     * @param {String} srcTextureConst
     *      URL of the texture for the constellations.
     * @param {String} srcTextureStars
     *      URL of the texture for the stars.
     * @param {String} srcTextureTampere
     *      URL of the texture for Tampere.
     */
    init(srcTextureGrid, srcTextureSphere, srcTextureConst, srcTextureStars, srcTextureTampere)
    {
        let gl = this.gl;
        this.program = compileProgram(gl, this.vertShaderSphere, this.fragShaderSphere);
        this.programGrid = compileProgram(gl, this.vertShaderGrid, this.fragShaderGrid);

        // Get attribute and uniform locations.
        this.posAttrLocation = gl.getAttribLocation(this.program, "a_position");
        this.texAttrLocation = gl.getAttribLocation(this.program, "a_texcoord");
        this.matrixLocation = gl.getUniformLocation(this.program, "u_matrix");

        this.posAttrLocationGrid = gl.getAttribLocation(this.programGrid, "a_position");
        this.colorAttrLocationGrid = gl.getAttribLocation(this.programGrid, "a_color");
        this.matrixLocationGrid = gl.getUniformLocation(this.programGrid, "u_matrix");

        this.vertexArraySphere = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArraySphere);

        // Load sphere vertex coordinates into a buffer.
        let positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        this.setGeometry();
        gl.enableVertexAttribArray(this.posAttrLocation);
        gl.vertexAttribPointer(this.posAttrLocation, 3, gl.FLOAT, false, 0, 0);

        // Load texture vertex coordinates into a buffer.
        const texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        this.setTexcoords();
        gl.enableVertexAttribArray(this.texAttrLocation);
        gl.vertexAttribPointer(this.texAttrLocation, 2, gl.FLOAT, true, 0, 0);        

        // Load grid coordinates.
        this.vertexArrayGrid = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayGrid);

        this.positionBufferGrid = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBufferGrid);
        this.setGeometryGrid();
        gl.enableVertexAttribArray(this.posAttrLocationGrid);
        gl.vertexAttribPointer(this.posAttrLocationGrid, 3, gl.FLOAT, false, 0, 0);
      
        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        this.setColorsGrid();
        gl.enableVertexAttribArray(this.colorAttrLocationGrid);
        gl.vertexAttribPointer(this.colorAttrLocationGrid, 3, gl.UNSIGNED_BYTE, true, 0, 0);

        // Initialize buffer for map coordinates.
        this.vertexArrayMap = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayMap);

        this.positionBufferMap = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBufferMap);
        gl.enableVertexAttribArray(this.posAttrLocationGrid);
        gl.vertexAttribPointer(this.posAttrLocationGrid, 3, gl.FLOAT, false, 0, 0);
      
        this.colorBufferMap = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBufferMap);
        gl.enableVertexAttribArray(this.colorAttrLocationGrid);
        gl.vertexAttribPointer(this.colorAttrLocationGrid, 3, gl.UNSIGNED_BYTE, true, 0, 0);


        // Load textures:
        const imageGrid = new Image();
        imageGrid.src = srcTextureGrid;
        const imageLocationGrid = gl.getUniformLocation(this.program, "texture_grid");
        
        const imageSphere = new Image();
        imageSphere.src = srcTextureSphere;
        const imageLocationSphere = gl.getUniformLocation(this.program, "texture_galaxy");

        const imageConst = new Image();
        imageConst.src = srcTextureConst;
        const imageLocationConst = gl.getUniformLocation(this.program, "texture_const");

        const imageStars = new Image();
        imageStars.src = srcTextureStars;
        const imageLocationStars = gl.getUniformLocation(this.program, "texture_stars");

        const imageTampere = new Image();
        imageTampere.src = srcTextureTampere;
        const imageLocationTampere = gl.getUniformLocation(this.program, "texture_tampere");
        
        this.numTextures = 0;
        let instance = this;
        imageGrid.addEventListener('load', function() {
            instance.loadTexture(0, imageGrid, imageLocationGrid);
        });
        imageSphere.addEventListener('load', function() {
            instance.loadTexture(1, imageSphere, imageLocationSphere);
        });
        imageConst.addEventListener('load', function() {
            instance.loadTexture(2, imageConst, imageLocationConst);
        });
        imageStars.addEventListener('load', function() {
            instance.loadTexture(3, imageStars, imageLocationStars);
        });
        imageTampere.addEventListener('load', function() {
            instance.loadTexture(4, imageTampere, imageLocationTampere);
        });
            
        gl.useProgram(this.program);
    }

    /**
     * Load texture.
     * 
     * @param {Number} index 
     *      Index of the texture.
     * @param {Image} image 
     *      The image to be loaded.
     * @param {WebGLUniformLocation} imageLocation 
     *      Uniform location for the texture.
     */
    loadTexture(index, image, imageLocation)
    {
        let gl = this.gl;

        gl.useProgram(this.program);
        // Create a texture.
        var texture = gl.createTexture();

        // use texture unit 0
        gl.activeTexture(gl.TEXTURE0 + index);

        // bind to the TEXTURE_2D bind point of texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Fill the texture with a 1x1 blue pixel.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.uniform1i(imageLocation, index);
        this.numTextures = this.numTextures + 1;
    }

    /**
     * Insert array of numbers into Float32Array;
     * 
     * @param {*} buffer 
     *      Target buffer.
     * @param {*} index 
     *      Start index.
     * @param {*} arrayIn 
     *      Array to be inserted.
     */
    insertBufferFloat32(buffer, index, arrayIn)
    {
        for (let indArray = 0; indArray < arrayIn.length; indArray++)
        {
            buffer[index + indArray] = arrayIn[indArray]; 
        }
    }

    /**
     * Insert square segment of a sphere into a Float32Buffer.
     * 
     * @param {*} buffer 
     *      The target buffer.
     * @param {*} indRect 
     *      The index of the rectangle.
     * @param {*} lonStart 
     *      Longitude start of the rectangle.
     * @param {*} lonEnd 
     *      Longitude end of the rectangle.
     * @param {*} latStart 
     *      Latitude start of the rectangle.
     * @param {*} latEnd 
     *      Latitude end of the rectangle.
     */
    insertRectGeo(buffer, indRect, lonStart, lonEnd, latStart, latEnd)
    {
        const indStart = indRect * 3 * 6;

        const x1 = this.a * Math.cos(latStart) * Math.cos(lonStart);
        const y1 = this.a * Math.cos(latStart) * Math.sin(lonStart);
        const z1 = this.b * Math.sin(latStart);
        const x2 = this.a * Math.cos(latStart) * Math.cos(lonEnd);
        const y2 = this.a * Math.cos(latStart) * Math.sin(lonEnd);
        const z2 = this.b * Math.sin(latStart);
        const x3 = this.a * Math.cos(latEnd) * Math.cos(lonEnd);
        const y3 = this.a * Math.cos(latEnd) * Math.sin(lonEnd);
        const z3 = this.b * Math.sin(latEnd);
        const x4 = this.a * Math.cos(latEnd) * Math.cos(lonStart);
        const y4 = this.a * Math.cos(latEnd) * Math.sin(lonStart);
        const z4 = this.b * Math.sin(latEnd);

        this.insertBufferFloat32(buffer, indStart, [x1,y1,z1, x2,y2,z2, x3,y3,z3, 
            x1,y1,z1, x3,y3,z3, x4,y4,z4]);
    }

    /**
     * Fill vertex buffer for sphere triangles.
     */
    setGeometry() 
    {
        const gl = this.gl;
        const nTri = this.nLon * this.nLat * 2;
        const nPoints = nTri * 3;
        const positions = new Float32Array(nPoints * 3);

        for (let lonStep = 0; lonStep < this.nLon; lonStep++)
        {
            const lon = 2 * Math.PI * (lonStep / this.nLon - 0.5);
            const lonNext = 2 * Math.PI * ((lonStep + 1) / this.nLon - 0.5);

            for (let latStep = 0; latStep <= this.nLat-1; latStep++)
            {
                const lat =  Math.PI * (latStep / this.nLat - 0.5);
                const latNext = Math.PI * ((latStep + 1) / this.nLat - 0.5);
                const indTri = latStep + lonStep * this.nLat;
                this.insertRectGeo(positions, indTri, lon, lonNext, lat, latNext, 1);
            }  
        }
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }
    
    /**
     * Insert a texture coordinates for a square segment.
     * 
     * @param {*} buffer
     *      Target buffer. 
     * @param {*} indRect 
     *      Index of the rectangle.
     * @param {*} lonStart 
     *      Longitude start (radians).
     * @param {*} lonEnd 
     *      Longitude end (radians).
     * @param {*} latStart
     *      Latitude start (radians). 
     * @param {*} latEnd 
     *      Latitude end (radians).
     */
    insertRectTex(buffer, indRect, lonStart, lonEnd, latStart, latEnd)
    {
        const indStart  = indRect * 2 * 6;
        const uLonStart = (lonStart / (2 * Math.PI)) + 0.5;
        const uLonEnd   = (lonEnd / (2 * Math.PI)) + 0.5;
        const uLatStart = -(latStart) / Math.PI + 0.5;
        const uLatEnd   = -(latEnd) / Math.PI + 0.5;

        this.insertBufferFloat32(buffer, indStart, 
            [uLonStart, uLatStart, uLonEnd, uLatStart, uLonEnd,   uLatEnd,
             uLonStart, uLatStart, uLonEnd, uLatEnd,   uLonStart, uLatEnd]);
    }

    /**
     * Fill vertex buffer for textures
     */
    setTexcoords() 
    {
        const gl = this.gl;
        const nTri = this.nLon * this.nLat * 2;
        const nPoints = nTri * 3;
        const positions = new Float32Array(nPoints * 2);

        for (let lonStep = 0; lonStep <= this.nLon; lonStep++)
        {
            const lon = 2 * Math.PI * (lonStep / this.nLon - 0.5);
            const lonNext = 2 * Math.PI * ((lonStep + 1) / this.nLon - 0.5);

            for (let latStep = 0; latStep <= this.nLat; latStep++)
            {
                const lat =  Math.PI * (latStep / this.nLat - 0.5);
                const latNext = Math.PI * ((latStep + 1) / this.nLat - 0.5);
                const indTri = latStep + lonStep * this.nLat;

                this.insertRectTex(positions, indTri, lon, lonNext, lat, latNext);
            }  
        }
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    /**
     * Draw the sphere.
     * 
     * @param {*} viewMatrix 
     *      The view matrix.
     * @param {*} betaLon
     *      The longitude of the vector beta parameter.
     * @param {*} betaLat
     *      The latitude of the vector beta parameter.
     * @param {*} beta
     *      The magnitude of the vector beta parameter.
     * @param {*} drawGrid
     *      Whether to draw the grid.
     * @param {*} drawGalaxy
     *      Whether to draw the galaxy.
     * @param {*} drawStars
     *      Whether to draw the stars.
     * @param {*} drawConst
     *      Whether to draw the constellations.
     * @param {*} drawTampere
     *      Whether to draw Tampere.
     */
    draw(viewMatrix, beta_lon, beta_lat, beta, drawGrid, drawGalaxy, drawStars, drawConst, drawTampere)
    {
        if (this.numTextures < 2)
        {
            return;
        }
        const gl = this.gl;

        gl.useProgram(this.program);
        gl.uniformMatrix4fv(this.matrixLocation, false, viewMatrix);
        gl.disable(gl.CULL_FACE)

        const drawGridLocation = gl.getUniformLocation(this.program, "u_draw_grid");
        const drawGalaxyLocation = gl.getUniformLocation(this.program, "u_draw_galaxy");
        const drawStarsLocation = gl.getUniformLocation(this.program, "u_draw_stars");
        const drawConstLocation = gl.getUniformLocation(this.program, "u_draw_const");
        const drawTampereLocation = gl.getUniformLocation(this.program, "u_draw_tampere");

        gl.uniform1f(drawGridLocation, drawGrid ? 1 : 0);
        gl.uniform1f(drawGalaxyLocation, drawGalaxy ? 1 : 0);
        gl.uniform1f(drawStarsLocation, drawStars ? 1 : 0);
        gl.uniform1f(drawConstLocation, drawConst ? 1 : 0);
        gl.uniform1f(drawTampereLocation, drawTampere ? 1 : 0);

        const betaXLocation = gl.getUniformLocation(this.program, "beta_x");
        const betaYLocation = gl.getUniformLocation(this.program, "beta_y");
        const betaZLocation = gl.getUniformLocation(this.program, "beta_z");

        const beta_x = beta * MathUtils.cosd(beta_lat) * MathUtils.cosd(beta_lon);
        const beta_y = beta * MathUtils.cosd(beta_lat) * MathUtils.sind(beta_lon);
        const beta_z = beta * MathUtils.sind(beta_lat);

        gl.uniform1f(betaXLocation, beta_x);
        gl.uniform1f(betaYLocation, beta_y);
        gl.uniform1f(betaZLocation, beta_z);

        // Draw the sphere.
        gl.bindVertexArray(this.vertexArraySphere);
        const nTri = this.nLon * this.nLat * 2;
        const count = nTri * 3;
        gl.drawArrays(gl.TRIANGLES, 0, count);

        gl.useProgram(this.programGrid);
        gl.bindVertexArray(this.vertexArrayGrid);
        gl.uniformMatrix4fv(this.matrixLocationGrid, false, viewMatrix);
        if (drawGrid)
        {
            //gl.drawArrays(gl.LINES, 0, this.gridLines * 2);
        }
    }

    // Fill the current ARRAY_BUFFER buffer with grid.
    setGeometryGrid() 
    {
        let gl = this.gl;
        const points = [];
        let lonStep = 2.0;
        let latStep = this.latGridStep;
        let nLines = 0;

        let gridCoeff = 0.998;
        const nStepLat = Math.floor(90.0 / latStep);

        for (let lat = -nStepLat * latStep; lat <= nStepLat * latStep; lat += latStep)
        {
            for (let lon = -180.0; lon < 180.0; lon += lonStep)
            {
                const xStart = gridCoeff * this.a * MathUtils.cosd(lat) * MathUtils.cosd(lon);
                const yStart = gridCoeff * this.a * MathUtils.cosd(lat) * MathUtils.sind(lon);
                const zStart = gridCoeff * this.b * MathUtils.sind(lat);
                const xEnd = gridCoeff * this.a * MathUtils.cosd(lat) * MathUtils.cosd(lon + lonStep);
                const yEnd = gridCoeff * this.a * MathUtils.cosd(lat) * MathUtils.sind(lon + lonStep);
                const zEnd = gridCoeff * this.b * MathUtils.sind(lat);
                points.push([xStart, yStart, zStart]);
                points.push([xEnd, yEnd, zEnd]);
                nLines++;
            }
        }
        latStep = 2.0;
        lonStep = this.lonGridStep;
        const nStepLon = Math.floor(180.0 / lonStep);

        for (let lon = -nStepLon * lonStep; lon <= nStepLon * lonStep; lon += lonStep)
        {
            for (let lat = -90.0; lat < 90.0; lat += latStep)
            {
                const xStart = gridCoeff * this.a * MathUtils.cosd(lat) * MathUtils.cosd(lon);
                const yStart = gridCoeff * this.a * MathUtils.cosd(lat) * MathUtils.sind(lon);
                const zStart = gridCoeff * this.b * MathUtils.sind(lat);
                const xEnd = gridCoeff * this.a * MathUtils.cosd(lat + latStep) * MathUtils.cosd(lon);
                const yEnd = gridCoeff * this.a * MathUtils.cosd(lat + latStep) * MathUtils.sind(lon);
                const zEnd = gridCoeff * this.b * MathUtils.sind(lat + latStep);
                points.push([xStart, yStart, zStart]);
                points.push([xEnd, yEnd, zEnd]);
                nLines++;
            }
        }

        this.gridLines = nLines;
        var positions = new Float32Array(this.gridLines * 6);

        for (let indPoint = 0; indPoint < points.length; indPoint++)
        {
            let point = points[indPoint];
            let indStart = indPoint * 3;
            positions[indStart] = point[0];
            positions[indStart + 1] = point[1];
            positions[indStart + 2] = point[2];
        }
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    /**
     * Update grid resolution.
     * 
     * @param {*} lonRes
     *      Longitude resolution in degrees. 
     * @param {*} latRes 
     *      Latitude resolution in degrees.
     */
    updateGrid(lonRes, latRes)
    {
        this.lonGridStep = lonRes;
        this.latGridStep = latRes;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBufferGrid);
        this.setGeometryGrid();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        this.setColorsGrid();
    }
  
    // Fill the current ARRAY_BUFFER buffer with colors for the 'F'.
    setColorsGrid() 
    {
        let gl = this.gl;
        const colorArray = new Uint8Array(this.gridLines * 6);

        for (let indPoint = 0; indPoint < this.gridLines * 2; indPoint++)
        {
            const startIndex = indPoint * 3;
            colorArray[startIndex] = this.colorGrid[0];
            colorArray[startIndex + 1] = this.colorGrid[1];
            colorArray[startIndex + 2] = this.colorGrid[2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, colorArray, gl.STATIC_DRAW);
    }
}