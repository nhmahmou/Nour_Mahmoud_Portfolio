/* assignment specific globals */
const INPUT_TRIANGLES_URL = "triangles.json"; // triangles file loc
const INPUT_ELLIPSOIDS_URL = "ellipsoids.json"; // ellipsoids file loc

const TEX_BASE_URL = "";

var defaultEye = vec3.fromValues(0.5,0.5,-0.5); // default eye position in world space
var defaultCenter = vec3.fromValues(0.5,0.5,0.5); // default view direction in world space
var defaultUp = vec3.fromValues(0,1,0); // default view up vector
var lightAmbient = vec3.fromValues(1,1,1); // default light ambient emission
var lightDiffuse = vec3.fromValues(1,1,1); // default light diffuse emission
var lightSpecular = vec3.fromValues(1,1,1); // default light specular emission
var lightPosition = vec3.fromValues(-0.5,1.5,-0.5); // default light position
var rotateTheta = Math.PI/50; // how much to rotate models by with each key press

/* webgl and geometry data */
var gl = null; // the all powerful gl object. It's all here folks!
var inputTriangles = []; // the triangle data as loaded from input files
var numTriangleSets = 0; // how many triangle sets in input scene
var inputEllipsoids = []; // the ellipsoid data as loaded from input files
var numEllipsoids = 0; // how many ellipsoids in the input scene
var vertexBuffers = []; // this contains vertex coordinate lists by set, in triples
var normalBuffers = []; // this contains normal component lists by set, in triples
var triSetSizes = []; // this contains the size of each triangle set
var triangleBuffers = []; // lists of indices into vertexBuffers by set, in triples
var viewDelta = 0; // how much to displace view with each key press


var textureBuffers = []; 
var texCoordAttribLoc;
var modelTextures = []; // texture per triangle/ellipsoid
var textureCache = {}; // filename -> WebGLTexture

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader


var useLightingULoc;   
var gUseLighting = 1;  
var blendModeULoc;     
var gBlendMode = 1;  // 1 = modulate (default for Part 3), 0 = replace
var alphaULoc;

/* added for Minecraft part 5 */
var uKeyEnableULoc;
var uKeyColorULoc;
var uKeyThreshULoc;

/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input json file

function getOrCreateTexture(gl, filename) {
    // fallback if the JSON forgot to give a texture
    const fullUrl = TEX_BASE_URL + filename;

    if (textureCache[fullUrl]) {
        return textureCache[fullUrl];
    }
    const tex = loadTexture(gl, fullUrl);
    textureCache[fullUrl] = tex;
    return tex;
}

/* WORLD TOGGLE (minecraft or assignment) + MINECRAFT GLOBALS */

// world modes
const MODE_STANDARD = 0;
const MODE_MINECRAFT = 1;
let gWorldMode = MODE_STANDARD;

// restore the std scene camera & step
let savedStdCam = {
    Eye: vec3.clone(defaultEye),
    Center: vec3.clone(defaultCenter),
    Up: vec3.clone(defaultUp),
    viewDelta: 0
};

// Minecraft camera right place
const mcDefaultEye = vec3.fromValues(12.0, 3.2, 2.0);
const mcDefaultCenter = vec3.fromValues(12.0, 2.5, 12.0);
const mcDefaultUp = vec3.fromValues(0, 1, 0);
const mcViewDelta = 0.12;

// Minecraft textures - got them from google
const ATLAS_URL = "minecraft_atlas.png"; //256 x 256
const MCBLOCK_URL = "minecraft_block.jpg"; // 4 x 3 grass cube sheet
let atlasTexture = null, blockTexture = null;

let mcReady = false;

const ATLAS_SIZE = 256, TILE_SIZE = 16, PAD = 0.5/ATLAS_SIZE; //16 x 16 = 256 tiles
const WORLD = [];
const WORLD_SIZE = 24;

let cubeParts = {
    vbo:null, //vertex buffer object
    nbo:null, //normal buffer
    tbo:null, //texture buffer
    ibo:null, //index buffer
    count:0 //how many indices to draw
};

const cubeMeshCache = new Map(); //lookup table to avoid rebuilding same cube if we are drawing similar stuff like grass


function handleKeyDown(event) {
     const modelEnum = {TRIANGLES: "triangles", ELLIPSOID: "ellipsoid"}; // enumerated model type
    const dirEnum = {NEGATIVE: -1, POSITIVE: 1}; // enumerated rotation direction
    
    function highlightModel(modelType,whichModel) {
        if (handleKeyDown.modelOn != null)
            handleKeyDown.modelOn.on = false;
        handleKeyDown.whichOn = whichModel;
        if (modelType == modelEnum.TRIANGLES)
            handleKeyDown.modelOn = inputTriangles[whichModel]; 
        else
            handleKeyDown.modelOn = inputEllipsoids[whichModel]; 
        handleKeyDown.modelOn.on = true; 
    } // end highlight model
    
    function translateModel(offset) {
        if (handleKeyDown.modelOn != null)
            vec3.add(handleKeyDown.modelOn.translation,handleKeyDown.modelOn.translation,offset);
    } // end translate model

    function rotateModel(axis,direction) {
        if (handleKeyDown.modelOn != null) {
            var newRotation = mat4.create();

            mat4.fromRotation(newRotation,direction*rotateTheta,axis); // get a rotation matrix around passed axis
            vec3.transformMat4(handleKeyDown.modelOn.xAxis,handleKeyDown.modelOn.xAxis,newRotation); // rotate model x axis tip
            vec3.transformMat4(handleKeyDown.modelOn.yAxis,handleKeyDown.modelOn.yAxis,newRotation); // rotate model y axis tip
        } // end if there is a highlighted model
    } // end rotate model
    
    // set up needed view params
    var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt,vec3.subtract(temp,Center,Eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight,vec3.cross(temp,lookAt,Up)); // get view right vector
    
    // highlight static variables
    handleKeyDown.whichOn = handleKeyDown.whichOn == undefined ? -1 : handleKeyDown.whichOn; // nothing selected initially
    handleKeyDown.modelOn = handleKeyDown.modelOn == undefined ? null : handleKeyDown.modelOn; // nothing selected initially

    switch (event.code) {
        
        // model selection
        case "Space": 
            if (handleKeyDown.modelOn != null)
                handleKeyDown.modelOn.on = false; // turn off highlighted model
            handleKeyDown.modelOn = null; // no highlighted model
            handleKeyDown.whichOn = -1; // nothing highlighted
            break;
        case "ArrowRight": // select next triangle set
            highlightModel(modelEnum.TRIANGLES,(handleKeyDown.whichOn+1) % numTriangleSets);
            break;
        case "ArrowLeft": // select previous triangle set
            highlightModel(modelEnum.TRIANGLES,(handleKeyDown.whichOn > 0) ? handleKeyDown.whichOn-1 : numTriangleSets-1);
            break;
        case "ArrowUp": // select next ellipsoid
            highlightModel(modelEnum.ELLIPSOID,(handleKeyDown.whichOn+1) % numEllipsoids);
            break;
        case "ArrowDown": // select previous ellipsoid
            highlightModel(modelEnum.ELLIPSOID,(handleKeyDown.whichOn > 0) ? handleKeyDown.whichOn-1 : numEllipsoids-1);
            break;
            
        // view change
        case "KeyA": // translate view left, rotate left with shift
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,viewDelta));
            break;
        case "KeyD": // translate view right, rotate right with shift
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,-viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,-viewDelta));
            break;
        case "KeyS": // translate view backward, rotate up with shift
            if (event.getModifierState("Shift")) {
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,viewDelta));
                Up = vec3.cross(Up,viewRight,vec3.subtract(lookAt,Center,Eye)); /* global side effect */
            } else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,-viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,-viewDelta));
            } // end if shift not pressed
            break;
        case "KeyW": // translate view forward, rotate down with shift
            if (event.getModifierState("Shift")) {
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,-viewDelta));
                Up = vec3.cross(Up,viewRight,vec3.subtract(lookAt,Center,Eye)); /* global side effect */
            } else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,viewDelta));
            } // end if shift not pressed
            break;
        case "KeyQ": // translate view up, rotate counterclockwise with shift
            if (event.getModifierState("Shift"))
                Up = vec3.normalize(Up,vec3.add(Up,Up,vec3.scale(temp,viewRight,-viewDelta)));
            else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,Up,viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,viewDelta));
            } // end if shift not pressed
            break;
        case "KeyE": // translate view down, rotate clockwise with shift
            if (event.getModifierState("Shift"))
                Up = vec3.normalize(Up,vec3.add(Up,Up,vec3.scale(temp,viewRight,viewDelta)));
            else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,Up,-viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,Up,-viewDelta));
            } // end if shift not pressed
            break;
        case "Escape": // reset view to default
            Eye = vec3.copy(Eye,defaultEye);
            Center = vec3.copy(Center,defaultCenter);
            Up = vec3.copy(Up,defaultUp);
            break;
            
        // model transformation
        case "KeyK": // translate left, rotate left with shift
            if (event.getModifierState("Shift"))
                rotateModel(Up,dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp,viewRight,viewDelta));
            break;
        case "Semicolon": // translate right, rotate right with shift
            if (event.getModifierState("Shift"))
                rotateModel(Up,dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp,viewRight,-viewDelta));
            break;
        case "KeyL": // translate backward, rotate up with shift
            if (event.getModifierState("Shift"))
                rotateModel(viewRight,dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp,lookAt,-viewDelta));
            break;
        case "KeyO": // translate forward, rotate down with shift
            if (event.getModifierState("Shift"))
                rotateModel(viewRight,dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp,lookAt,viewDelta));
            break;
        case "KeyI": // translate up, rotate counterclockwise with shift 
            if (event.getModifierState("Shift"))
                rotateModel(lookAt,dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp,Up,viewDelta));
            break;
        case "KeyP": // translate down, rotate clockwise with shift
            if (event.getModifierState("Shift"))
                rotateModel(lookAt,dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp,Up,-viewDelta));
            break;
        case "Backspace": // reset model transforms to default
            for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) {
                vec3.set(inputTriangles[whichTriSet].translation,0,0,0);
                vec3.set(inputTriangles[whichTriSet].xAxis,1,0,0);
                vec3.set(inputTriangles[whichTriSet].yAxis,0,1,0);
            } // end for all triangle sets
            for (var whichEllipsoid=0; whichEllipsoid<numEllipsoids; whichEllipsoid++) {
                vec3.set(inputEllipsoids[whichEllipsoid].translation,0,0,0);
                vec3.set(inputEllipsoids[whichTriSet].xAxis,1,0,0);
                vec3.set(inputEllipsoids[whichTriSet].yAxis,0,1,0);
            } // end for all ellipsoids
            break;
        case "KeyT":
            gUseLighting = gUseLighting ? 0 : 1;
            gl.uniform1i(useLightingULoc, gUseLighting);
            break;
        case "KeyB":
            if (!gUseLighting) {
                gUseLighting = 1;
                gl.uniform1i(useLightingULoc, gUseLighting);
            }
            //replace (tex), modulate (lit * tex), add (tex + light), spec (tex lit + specular), 
            gBlendMode = (gBlendMode + 1) % 5; //there are 0 to 4 blend modes
            gl.uniform1i(blendModeULoc, gBlendMode);
            break;
        default:
            // toggle worlds with "!"
            if (event.key === '!') {
                toggleMinecraft();
            }
            break;
    } // end switch
} // end handleKeyDown


   
// set up the webGL environment 
function setupWebGL() {
   // Set up keys
    document.onkeydown = handleKeyDown; // call this when key pressed


    var imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
      var cw = imageCanvas.width, ch = imageCanvas.height; 
      imageContext = imageCanvas.getContext("2d"); 
      var bkgdImage = new Image(); 
      bkgdImage.crossOrigin = "Anonymous";
      bkgdImage.src = "sky.jpg";
      bkgdImage.onload = function(){
          var iw = bkgdImage.width, ih = bkgdImage.height;
          imageContext.drawImage(bkgdImage,0,0,iw,ih,0,0,cw,ch);   
     }

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl", { alpha: true, antialias: true }); // transparent and add antialias
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        //gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
} // end setupWebGL


// read models in, load them into webgl buffers
function loadModels() {
    
    // make an ellipsoid, with numLongSteps longitudes.
    // start with a sphere of radius 1 at origin
    // Returns verts, tris and normals.
    function makeEllipsoid(currEllipsoid,numLongSteps) {
        
        try {
            if (numLongSteps % 2 != 0)
                throw "in makeSphere: uneven number of longitude steps!";
            else if (numLongSteps < 4)
                throw "in makeSphere: number of longitude steps too small!";
            else { // good number longitude steps
            
                // console.log("ellipsoid xyz: "+ ellipsoid.x +" "+ ellipsoid.y +" "+ ellipsoid.z);
                
                // make vertices
                var ellipsoidVertices = [0,-1,0]; // vertices to return, init to south pole
                var angleIncr = (Math.PI+Math.PI) / numLongSteps; // angular increment 
                var latLimitAngle = angleIncr * (Math.floor(numLongSteps/4)-1); // start/end lat angle
                var latRadius, latY; // radius and Y at current latitude
                for (var latAngle=-latLimitAngle; latAngle<=latLimitAngle; latAngle+=angleIncr) {
                    latRadius = Math.cos(latAngle); // radius of current latitude
                    latY = Math.sin(latAngle); // height at current latitude
                    for (var longAngle=0; longAngle<2*Math.PI; longAngle+=angleIncr) // for each long
                        ellipsoidVertices.push(latRadius*Math.sin(longAngle),latY,latRadius*Math.cos(longAngle));
                } // end for each latitude
                ellipsoidVertices.push(0,1,0); // add north pole
                ellipsoidVertices = ellipsoidVertices.map(function(val,idx) { // position and scale ellipsoid
                    switch (idx % 3) {
                        case 0: // x
                            return(val*currEllipsoid.a+currEllipsoid.x);
                        case 1: // y
                            return(val*currEllipsoid.b+currEllipsoid.y);
                        case 2: // z
                            return(val*currEllipsoid.c+currEllipsoid.z);
                    } // end switch
                }); 

                // make normals using the ellipsoid gradient equation
                // resulting normals are unnormalized: we rely on shaders to normalize
                var ellipsoidNormals = ellipsoidVertices.slice(); // start with a copy of the transformed verts
                ellipsoidNormals = ellipsoidNormals.map(function(val,idx) { // calculate each normal
                    switch (idx % 3) {
                        case 0: // x
                            return(2/(currEllipsoid.a*currEllipsoid.a) * (val-currEllipsoid.x));
                        case 1: // y
                            return(2/(currEllipsoid.b*currEllipsoid.b) * (val-currEllipsoid.y));
                        case 2: // z
                            return(2/(currEllipsoid.c*currEllipsoid.c) * (val-currEllipsoid.z));
                    } // end switch
                }); 
                
                // make triangles, from south pole to middle latitudes to north pole
                var ellipsoidTriangles = []; // triangles to return
                for (var whichLong=1; whichLong<numLongSteps; whichLong++) // south pole
                    ellipsoidTriangles.push(0,whichLong,whichLong+1);
                ellipsoidTriangles.push(0,numLongSteps,1); // longitude wrap tri
                var llVertex; // lower left vertex in the current quad
                for (var whichLat=0; whichLat<(numLongSteps/2 - 2); whichLat++) { // middle lats
                    for (var whichLong=0; whichLong<numLongSteps-1; whichLong++) {
                        llVertex = whichLat*numLongSteps + whichLong + 1;
                        ellipsoidTriangles.push(llVertex,llVertex+numLongSteps,llVertex+numLongSteps+1);
                        ellipsoidTriangles.push(llVertex,llVertex+numLongSteps+1,llVertex+1);
                    } // end for each longitude
                    ellipsoidTriangles.push(llVertex+1,llVertex+numLongSteps+1,llVertex+2);
                    ellipsoidTriangles.push(llVertex+1,llVertex+2,llVertex-numLongSteps+2);
                } // end for each latitude
                for (var whichLong=llVertex+2; whichLong<llVertex+numLongSteps+1; whichLong++) // north pole
                    ellipsoidTriangles.push(whichLong,ellipsoidVertices.length/3-1,whichLong+1);
                ellipsoidTriangles.push(ellipsoidVertices.length/3-2,ellipsoidVertices.length/3-1,
                                        ellipsoidVertices.length/3-numLongSteps-1); // longitude wrap
            } // end if good number longitude steps
            return({vertices:ellipsoidVertices, normals:ellipsoidNormals, triangles:ellipsoidTriangles});
        } // end try
        
        catch(e) {
            console.log(e);
        } // end catch
    } // end make ellipsoid
    
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles"); // read in the triangle data

    try {
        if (inputTriangles == String.null)
            throw "Unable to load triangles file!";
        else {
            var whichSetVert; // index of vertex in current triangle set
            var whichSetTri; // index of triangle in current triangle set
            var vtxToAdd; // vtx coords to add to the coord array
            var normToAdd; // vtx normal to add to the coord array
            var triToAdd; // tri indices to add to the index array
            var maxCorner = vec3.fromValues(Number.MIN_VALUE,Number.MIN_VALUE,Number.MIN_VALUE); // bbox corner
            var minCorner = vec3.fromValues(Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE); // other corner
        
            // process each triangle set to load webgl vertex and triangle buffers
            numTriangleSets = inputTriangles.length; // remember how many tri sets
            for (var whichSet=0; whichSet<numTriangleSets; whichSet++) { // for each tri set
                
                // set up hilighting, modeling translation and rotation
                inputTriangles[whichSet].center = vec3.fromValues(0,0,0);  // center point of tri set
                inputTriangles[whichSet].on = false; // not highlighted
                inputTriangles[whichSet].translation = vec3.fromValues(0,0,0); // no translation
                inputTriangles[whichSet].xAxis = vec3.fromValues(1,0,0); // model X axis
                inputTriangles[whichSet].yAxis = vec3.fromValues(0,1,0); // model Y axis 
                inputTriangles[whichSet].glTexCoords = [];


                // set up the vertex and normal arrays, define model center and axes
                inputTriangles[whichSet].glVertices = []; // flat coord list for webgl
                inputTriangles[whichSet].glNormals = []; // flat normal list for webgl
                var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set
                for (whichSetVert=0; whichSetVert<numVerts; whichSetVert++) { // verts in set
                    vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
                    normToAdd = inputTriangles[whichSet].normals[whichSetVert]; // get normal to add
                    inputTriangles[whichSet].glVertices.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]); // put coords in set coord list
                    inputTriangles[whichSet].glNormals.push(normToAdd[0],normToAdd[1],normToAdd[2]); // put normal in set coord list
                    vec3.max(maxCorner,maxCorner,vtxToAdd); // update world bounding box corner maxima
                    vec3.min(minCorner,minCorner,vtxToAdd); // update world bounding box corner minima
                    vec3.add(inputTriangles[whichSet].center,inputTriangles[whichSet].center,vtxToAdd); // add to ctr sum
                
                    var uvToAdd = inputTriangles[whichSet].uvs[whichSetVert];
                                            console.log(whichSetVert);

                    // if(whichSet == 1){
                    //     gl.depthMask(false);
                    // }
                    inputTriangles[whichSet].glTexCoords.push(1-uvToAdd[0], uvToAdd[1]);
                  

                
                } // end for vertices in set
                vec3.scale(inputTriangles[whichSet].center,inputTriangles[whichSet].center,1/numVerts); // avg ctr sum

                // send the vertex coords and normals to webGL
                vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glVertices),gl.STATIC_DRAW); // data in
                normalBuffers[whichSet] = gl.createBuffer(); // init empty webgl set normal component buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glNormals),gl.STATIC_DRAW); // data in
            
                // send texcoords to WebGL
                var texBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
                gl.bufferData(
                    gl.ARRAY_BUFFER,
                    new Float32Array(inputTriangles[whichSet].glTexCoords),
                    gl.STATIC_DRAW
                );
                textureBuffers[whichSet] = texBuffer;
                const texName = inputTriangles[whichSet].material.texture;
                modelTextures[whichSet] = getOrCreateTexture(gl, texName);

                // set up the triangle index array, adjusting indices across sets
                inputTriangles[whichSet].glTriangles = []; // flat index list for webgl
                triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length; // number of tris in this set
                for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
                    triToAdd = inputTriangles[whichSet].triangles[whichSetTri]; // get tri to add
                    inputTriangles[whichSet].glTriangles.push(triToAdd[0],triToAdd[1],triToAdd[2]); // put indices in set list
                } // end for triangles in set

                // send the triangle indices to webGL
                triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inputTriangles[whichSet].glTriangles),gl.STATIC_DRAW); // data in

            } // end for each triangle set 
        
            inputEllipsoids = getJSONFile(INPUT_ELLIPSOIDS_URL,"ellipsoids"); // read in the ellipsoids

            if (inputEllipsoids == String.null)
                throw "Unable to load ellipsoids file!";
            else {
                
                // init ellipsoid highlighting, translation and rotation; update bbox
                var ellipsoid; // current ellipsoid
                var ellipsoidModel; // current ellipsoid triangular model
                var temp = vec3.create(); // an intermediate vec3
                var minXYZ = vec3.create(), maxXYZ = vec3.create();  // min/max xyz from ellipsoid
                numEllipsoids = inputEllipsoids.length; // remember how many ellipsoids
                for (var whichEllipsoid=0; whichEllipsoid<numEllipsoids; whichEllipsoid++) {
                    
                    // set up various stats and transforms for this ellipsoid
                    ellipsoid = inputEllipsoids[whichEllipsoid];
                    ellipsoid.on = false; // ellipsoids begin without highlight
                    ellipsoid.translation = vec3.fromValues(0,0,0); // ellipsoids begin without translation
                    ellipsoid.xAxis = vec3.fromValues(1,0,0); // ellipsoid X axis
                    ellipsoid.yAxis = vec3.fromValues(0,1,0); // ellipsoid Y axis 
                    ellipsoid.center = vec3.fromValues(ellipsoid.x,ellipsoid.y,ellipsoid.z); // locate ellipsoid ctr
                    vec3.set(minXYZ,ellipsoid.x-ellipsoid.a,ellipsoid.y-ellipsoid.b,ellipsoid.z-ellipsoid.c); 
                    vec3.set(maxXYZ,ellipsoid.x+ellipsoid.a,ellipsoid.y+ellipsoid.b,ellipsoid.z+ellipsoid.c); 
                    vec3.min(minCorner,minCorner,minXYZ); // update world bbox min corner
                    vec3.max(maxCorner,maxCorner,maxXYZ); // update world bbox max corner

                    // make the ellipsoid model
                    ellipsoidModel = makeEllipsoid(ellipsoid,32);
    
                    // send the ellipsoid vertex coords and normals to webGL
                    vertexBuffers.push(gl.createBuffer()); // init empty webgl ellipsoid vertex coord buffer
                    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[vertexBuffers.length-1]); // activate that buffer
                    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ellipsoidModel.vertices),gl.STATIC_DRAW); // data in
                    normalBuffers.push(gl.createBuffer()); // init empty webgl ellipsoid vertex normal buffer
                    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[normalBuffers.length-1]); // activate that buffer
                    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ellipsoidModel.normals),gl.STATIC_DRAW); // data in
        
                    triSetSizes.push(ellipsoidModel.triangles.length);
    
                    // send the triangle indices to webGL
                    triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[triangleBuffers.length-1]); // activate that buffer
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(ellipsoidModel.triangles),gl.STATIC_DRAW); // data in
                } // end for each ellipsoid
                
                viewDelta = vec3.length(vec3.subtract(temp,maxCorner,minCorner)) / 100; // set global
            } // end if ellipsoid file loaded
        } // end if triangle file loaded
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end load models

//
// Initialize a texture and load an image.
//
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0, internalFormat = gl.RGBA, width = 1, height = 1, border = 0;
    const srcFormat = gl.RGBA, srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
        gl.TEXTURE_2D,level,
        internalFormat,
        width,
        height,
        border,
        srcFormat,
        srcType,
        pixel
    );

    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level, 
            internalFormat, 
            srcFormat, 
            srcType, 
            image
        );

       
        // Pixel-art sharpness - when the texture is zoomed in 
        // use NEAREST so pixels stay crisp/blocky - without this it would be blurry
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // WebGL1 has different requirements for power of 2 images
        // vs. non power of 2 images so check if the image is a
        // power of 2 in both dimensions.

        //if power of 2 like 256x256, it makes mipmaps to look better when picture is far
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
           // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;
    return texture;
}
function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

// setup the webGL shaders
function setupShaders() {
    // vertex shader
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        attribute vec2 aTextureCoord;

        uniform mat4 umMatrix; // the model matrix
        uniform mat4 upvmMatrix; // the project view model matrix

        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader

        varying vec2 vTextureCoord;

        void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z)); 


            vTextureCoord = aTextureCoord;
        }
    `;
    // fragment shader
    var fShaderCode = `
        precision mediump float; // set float to medium precision

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world
        uniform bool uUseLighting; //for part 2 (turn off and on)
        
        // light properties
        uniform vec3 uLightAmbient; // the light's ambient color
        uniform vec3 uLightDiffuse; // the light's diffuse color
        uniform vec3 uLightSpecular; // the light's specular color
        uniform vec3 uLightPosition; // the light's position
        uniform int uBlendMode; //0 = replace, 1 = modulate

        // material properties
        uniform vec3 uAmbient; // the ambient reflectivity
        uniform vec3 uDiffuse; // the diffuse reflectivity
        uniform vec3 uSpecular; // the specular reflectivity
        uniform float uShininess; // the specular exponent
        uniform float uAlpha;  // material alpha

        // texture/chroma key: https://stackoverflow.com/questions/29338905/how-to-essentially-chroma-key-in-webgl
        //similar to green screen
        uniform sampler2D uSampler;
        uniform bool uKeyEnable; //on/off switch if we wanna do chroma key or not
        uniform vec3 uKeyColor; //the color to remove
        uniform float uKeyThresh; //how close a pixel must be to remove it

        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment
        varying vec2 vTextureCoord;    

        void main(void) {
            // ambient term
            vec3 ambient = uAmbient*uLightAmbient; 
            
            // diffuse term
            vec3 normal = normalize(vVertexNormal); 
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term

            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term

            vec4 tex = texture2D(uSampler, vTextureCoord);

            // optional chroma key discard (for white-ish plant billboards)
            if (uKeyEnable) {
                //distance is webgl function that returns euclidean distance
                if (distance(tex.rgb, uKeyColor) < uKeyThresh) 
                discard;
            }

            // AI assisted: 
            // instead of smooth shading, I snap the diffuse light into 3 flat levels:
            //   if lambert < 0.25  -> q = 0.10  (shadow band)
            //   else if < 0.75     -> q = 0.60  (mid band)
            //   else               -> q = 1.00  (bright band)
            // this makes the model look more hand-drawn/cartoon.
            // ambient keeps the dark areas from going pitch black,
            // and I still add specular so the shiny edges pop.
            float q = lambert < 0.25 ? 0.10 : (lambert < 0.75 ? 0.60 : 1.0);
            vec3 toonLit = uAmbient*uLightAmbient + uDiffuse*uLightDiffuse*q + specular;

            vec3 base = tex.rgb;
            vec3 litAD = ambient + diffuse;
            vec3 litADS = litAD + specular;

            vec3 outRGB;
            if (!uUseLighting) {
                outRGB = base; // lighting off: texture only
            } else if (uBlendMode == 0) { // REPLACE
                outRGB = base;
            } else if (uBlendMode == 1) { // MODULATE
                outRGB = clamp(base * litADS, 0.0, 1.0);
            } else if (uBlendMode == 2) { // ADD
                outRGB = clamp(base + litAD, 0.0, 1.0);
            } else if (uBlendMode == 3) { // DECAL + SPEC
                outRGB = clamp(base * litAD + specular, 0.0, 1.0);
            } else { // TOON MODULATE
                outRGB = clamp(base * toonLit, 0.0, 1.0);
            }

            float a = tex.a * uAlpha;
            
            // remove fully/near-fully transparent texels so they don't write depth
            if (a < 0.05) 
                discard;
            gl_FragColor = vec4(outRGB, a);
        }
    `;
    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                vNormAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal"); // ptr to vertex normal attrib
                gl.enableVertexAttribArray(vNormAttribLoc); // connect attrib to array

                // locate vertex uniforms
                mMatrixULoc = gl.getUniformLocation(shaderProgram, "umMatrix"); // ptr to mmat
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat

                texCoordAttribLoc = gl.getAttribLocation(shaderProgram, "aTextureCoord");
                gl.enableVertexAttribArray(texCoordAttribLoc);


                // locate fragment uniforms
                var eyePositionULoc = gl.getUniformLocation(shaderProgram, "uEyePosition"); // ptr to eye position
                var lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient"); // ptr to light ambient
                var lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse"); // ptr to light diffuse
                var lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular"); // ptr to light specular
                var lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition"); // ptr to light position
                ambientULoc = gl.getUniformLocation(shaderProgram, "uAmbient"); // ptr to ambient
                diffuseULoc = gl.getUniformLocation(shaderProgram, "uDiffuse"); // ptr to diffuse
                specularULoc = gl.getUniformLocation(shaderProgram, "uSpecular"); // ptr to specular
                shininessULoc = gl.getUniformLocation(shaderProgram, "uShininess"); // ptr to shininess
                useLightingULoc = gl.getUniformLocation(shaderProgram, "uUseLighting");
                blendModeULoc = gl.getUniformLocation(shaderProgram, "uBlendMode");
                alphaULoc = gl.getUniformLocation(shaderProgram, "uAlpha");

                
                // chroma key 
                uKeyEnableULoc = gl.getUniformLocation(shaderProgram, "uKeyEnable");
                uKeyColorULoc = gl.getUniformLocation(shaderProgram, "uKeyColor");
                uKeyThreshULoc = gl.getUniformLocation(shaderProgram, "uKeyThresh");

                // constants
                gl.uniform3fv(eyePositionULoc, Eye);
                gl.uniform3fv(lightAmbientULoc, lightAmbient);
                gl.uniform3fv(lightDiffuseULoc, lightDiffuse);
                gl.uniform3fv(lightSpecularULoc, lightSpecular);
                gl.uniform3fv(lightPositionULoc, lightPosition);

                // sampler
                var samplerULoc = gl.getUniformLocation(shaderProgram, "uSampler");
                gl.uniform1i(samplerULoc, 0);

                // defaults
                gl.uniform1i(useLightingULoc, gUseLighting);
                gl.uniform1i(blendModeULoc, gBlendMode);
                gl.uniform1f(alphaULoc, 1.0);

                // key defaults
                gl.uniform1i(uKeyEnableULoc, 0);
                gl.uniform3f(uKeyColorULoc, 1.0, 1.0, 1.0);
                gl.uniform1f(uKeyThreshULoc, 0.33);
            }
        }
    } catch(e) { console.log(e); }
} // end setup shaders

// render the loaded model
function renderModels() {
    
    // construct the model transform matrix, based on model state
    function makeModelTransform(currModel) {
        var zAxis = vec3.create(), sumRotation = mat4.create(), temp = mat4.create(), negCtr = vec3.create();

        // move the model to the origin
        mat4.fromTranslation(mMatrix,vec3.negate(negCtr,currModel.center)); 
        
        // scale for highlighting if needed
        if (currModel.on)
            mat4.multiply(mMatrix,mat4.fromScaling(temp,vec3.fromValues(1.2,1.2,1.2)),mMatrix); // S(1.2) * T(-ctr)
        
        // rotate the model to current interactive orientation
        vec3.normalize(zAxis,vec3.cross(zAxis,currModel.xAxis,currModel.yAxis)); // get the new model z axis
        mat4.set(sumRotation, // get the composite rotation
            currModel.xAxis[0], currModel.yAxis[0], zAxis[0], 0,
            currModel.xAxis[1], currModel.yAxis[1], zAxis[1], 0,
            currModel.xAxis[2], currModel.yAxis[2], zAxis[2], 0,
            0, 0,  0, 1);
        mat4.multiply(mMatrix,sumRotation,mMatrix); // R(ax) * S(1.2) * T(-ctr)
        
        // translate back to model center
        mat4.multiply(mMatrix,mat4.fromTranslation(temp,currModel.center),mMatrix); // T(ctr) * R(ax) * S(1.2) * T(-ctr)

        // translate model to current interactive orientation
        mat4.multiply(mMatrix,mat4.fromTranslation(temp,currModel.translation),mMatrix); // T(pos)*T(ctr)*R(ax)*S(1.2)*T(-ctr)
        
    } // end make model transform
    
    // var hMatrix = mat4.create(); // handedness matrix
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    var mMatrix = mat4.create(); // model matrix
    var pvMatrix = mat4.create(); // hand * proj * view matrices
    var pvmMatrix = mat4.create(); // hand * proj * view * model matrices
    
    window.requestAnimationFrame(renderModels); // set up frame render callback
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    // set up projection and view
    // mat4.fromScaling(hMatrix,vec3.fromValues(-1,1,1)); // create handedness matrix
    mat4.perspective(pMatrix,0.5*Math.PI,1,0.1,10); // create projection matrix
    mat4.lookAt(vMatrix,Eye,Center,Up); // create view matrix
    mat4.multiply(pvMatrix,pvMatrix,pMatrix); // projection
    mat4.multiply(pvMatrix,pvMatrix,vMatrix); // projection * view

    //if the world is minecraft
    if (gWorldMode === MODE_MINECRAFT) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.disable(gl.BLEND);

        // draw all world objects
        for (const o of WORLD) {
            if (o.kind==='cube')       
                drawCubeObject(o);
            else if (o.kind==='wallZ') 
                drawWallZ(o);
            else                       
                drawTransparency(o);
        }
        return; // skip standard pipeline
    }

   // render each triangle set
    // Build draw lists and sort transparent back-to-front
    const opaque = [];
    const transparent = [];

    for (let i = 0; i < numTriangleSets; i++) {
        const set = inputTriangles[i];

        //UNCOMMENT FOR FIRST IMAGE
        // if(image1){
        //     inputTriangles[i].material.alpha = 1; 
        // }
        const a = (set.material && typeof set.material.alpha === "number") ? set.material.alpha : 1.0;

        // world center (for sorting): center + translation
        const worldCtr = vec3.create();
        vec3.add(worldCtr, set.center, set.translation);

        // view-space Z (needs glMatrix vec4, like vec3/mat4)
        const w = vec4.fromValues(worldCtr[0], worldCtr[1], worldCtr[2], 1.0);
        const v = vec4.create();
        vec4.transformMat4(v, w, vMatrix);   // v = view * worldCtr
        const viewZ = v[2];

        if (a < 0.999) 
            transparent.push({ idx: i, a, z: viewZ });
        else           
            opaque.push({ idx: i, a: 1.0, z: viewZ });
    }

    transparent.sort((A, B) => B.z - A.z);

    // helper: draw one set with given alpha - which is what was previosuly in the for loop
    function drawSet(idx, alpha) {
        const currSet = inputTriangles[idx];
        // model & pvm
        makeModelTransform(currSet);
        mat4.multiply(pvmMatrix, pvMatrix, mMatrix);
        gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix);
        gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix);

        // material
        gl.uniform3fv(ambientULoc,  currSet.material.ambient);
        gl.uniform3fv(diffuseULoc,  currSet.material.diffuse);
        gl.uniform3fv(specularULoc, currSet.material.specular);
        gl.uniform1f(shininessULoc, currSet.material.n);
        gl.uniform1f(alphaULoc, alpha);  // <-- NEW

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[idx]);
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[idx]);
        gl.vertexAttribPointer(vNormAttribLoc, 3, gl.FLOAT, false, 0, 0);

        // texcoords + texture
        gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffers[idx]);
        gl.vertexAttribPointer(texCoordAttribLoc, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, modelTextures[idx]);

        // indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[idx]);
        gl.drawElements(gl.TRIANGLES, 3 * triSetSizes[idx], gl.UNSIGNED_SHORT, 0);
    }

    // PASS 1: OPAQUE 
    // ( you will have to first render opaque objects with z-buffering on, 
    // then transparent objects with the z-write component of z-buffering off (gl.depthMask(false)).)
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    for (const o of opaque) 
        drawSet(o.idx, 1.0);

    // PASS 2: TRANSPARENT
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const t of transparent)
         drawSet(t.idx, t.a);

    // restore
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    
    // render each ellipsoid
    var ellipsoid, instanceTransform = mat4.create(); // the current ellipsoid and material
    
    // for (var whichEllipsoid=0; whichEllipsoid<numEllipsoids; whichEllipsoid++) {
    //     ellipsoid = inputEllipsoids[whichEllipsoid];
        
    //     // define model transform, premult with pvmMatrix, feed to vertex shader
    //     makeModelTransform(ellipsoid);
    //     pvmMatrix = mat4.multiply(pvmMatrix,pvMatrix,mMatrix); // premultiply with pv matrix
    //     gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in model matrix
    //     gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix); // pass in project view model matrix

    //     // reflectivity: feed to the fragment shader
    //     gl.uniform3fv(ambientULoc,ellipsoid.ambient); // pass in the ambient reflectivity
    //     gl.uniform3fv(diffuseULoc,ellipsoid.diffuse); // pass in the diffuse reflectivity
    //     gl.uniform3fv(specularULoc,ellipsoid.specular); // pass in the specular reflectivity
    //     gl.uniform1f(shininessULoc,ellipsoid.n); // pass in the specular exponent

    //     gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[numTriangleSets+whichEllipsoid]); // activate vertex buffer
    //     gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed vertex buffer to shader
    //     gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[numTriangleSets+whichEllipsoid]); // activate normal buffer
    //     gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0); // feed normal buffer to shader
    //     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[numTriangleSets+whichEllipsoid]); // activate tri buffer
        


    //     // draw a transformed instance of the ellipsoid
    //     gl.drawElements(gl.TRIANGLES,triSetSizes[numTriangleSets+whichEllipsoid],gl.UNSIGNED_SHORT,0); // render
    // } // end for each ellipsoid
} // end render model


/* MINECRAFT HELPERS / WORLD */

// get the uv for the tiles
function tileUV(c, r){
    const u0 = (c * TILE_SIZE + PAD) / ATLAS_SIZE; 
    const u1 = ((c + 1) * TILE_SIZE - PAD) / ATLAS_SIZE;
    const v1 = 1.0 - ((r * TILE_SIZE + PAD) / ATLAS_SIZE);
    const v0 = 1.0 - (((r+1) * TILE_SIZE - PAD) / ATLAS_SIZE);
    return [u0, v0, u1, v1];
}

//index to column/row
//each row has 16 tiles and there are 16 rows 256
//this gives the row and col of the tile we need in the atlas
function idxToCR(idx){ 
    const i = Math.max(1, idx) - 1; 
    return [i % 16, Math.floor(i / 16)]; 
}

// grass cube sheet (4x3) helper - this is for minecraft_block png
const MB_COLS = 4;
const MB_ROWS = 3;
const MB_U = 1 / MB_COLS;
const MB_V = 1 / MB_ROWS;
const MB_PAD_U = 0.5 / 1536;
const MB_PAD_V = 0.5 / 1152;

function mbTile(col, row){ 
    const u0 = col * MB_U + MB_PAD_U;
    const u1 = (col + 1) * MB_U - MB_PAD_U;
    const vTop = 1 - row * MB_V - MB_PAD_V
    const vBot = 1 - (row + 1) * MB_V + MB_PAD_V; 
    return [u0, vBot, u1, vTop]; 
}
const UV_TOP = mbTile(1,0);
const UV_SIDE = mbTile(1,1);
const UV_BOTTOM = mbTile(1,2);

// rotate UVs to make sure they're the right side up
function rotQuadCW(uv, degCW){																		// Define a function that rotates a UV rectangle by a multiple of 90° clockwise
	const [u0, v0, u1, v1] = uv;																		// Unpack the UV rectangle edges: left u0, bottom v0, right u1, top v1

	const BL = [u0, v0], BR = [u1, v0], TR = [u1, v1], TL = [u0, v1];									// Build the four corner UVs: Bottom-Left, Bottom-Right, Top-Right, Top-Left

	const seq0 = [BL, BR, TR, TL];																		// 0° rotation: original order (BL → BR → TR → TL)
	const seq1 = [BR, TR, TL, BL];																		// 90° CW: corners shift so BR becomes the new "start", then TR, TL, BL
	const seq2 = [TR, TL, BL, BR];																		// 180° CW: TR → TL → BL → BR
	const seq3 = [TL, BL, BR, TR];																		// 270° CW: TL → BL → BR → TR

    //converts degree to index from 0 to 3
	const k = ((Math.round(degCW / 90) % 4) + 4) % 4;													// Convert degrees to a step 0..3 by dividing by 90, rounding, mod 4, and fixing negatives

    //orders the tiles based on k
	const seq = [seq0, seq1, seq2, seq3][k];															// Pick the correct corner order based on k (0,1,2,3)

	return new Float32Array(seq.flat());																// Flatten the 4 corners into [u,v,u,v,...] and return as Float32Array for WebGL
}

// basic cube from the 4x3 block sheet for grass ground
function buildCubeFromMinecraftBlock() {																							// Build a unit cube centered at the origin with per-face UVs from a 4x3 sprite sheet
	// Positions (P): 24 vertices (4 per face × 6 faces). 
    // Each face is specified in CCW order 
	// Front (+Z), Back (−Z), Top (+Y), Bottom (−Y), Right (+X), Left (−X)
	const P = [																														// xyz triplets
		// Front face (+Z)
		-0.5, -0.5,  0.5,																											//  0: bottom-left
		 0.5, -0.5,  0.5,																											//  1: bottom-right
		 0.5,  0.5,  0.5,																											//  2: top-right
		-0.5,  0.5,  0.5,																											//  3: top-left

		// Back face (−Z)
		-0.5, -0.5, -0.5,																											//  4: bottom-left
		-0.5,  0.5, -0.5,																											//  5: top-left
		 0.5,  0.5, -0.5,																											//  6: top-right
		 0.5, -0.5, -0.5,																											//  7: bottom-right

		// Top face (+Y)
		-0.5,  0.5,  0.5,																											//  8:  front-left
		 0.5,  0.5,  0.5,																											//  9:  front-right
		 0.5,  0.5, -0.5,																											// 10:  back-right
		-0.5,  0.5, -0.5,																											// 11:  back-left

		// Bottom face (−Y)
		-0.5, -0.5,  0.5,																											// 12: front-left
		-0.5, -0.5, -0.5,																											// 13: back-left
		 0.5, -0.5, -0.5,																											// 14: back-right
		 0.5, -0.5,  0.5,																											// 15: front-right

		// Right face (+X)
		 0.5, -0.5,  0.5,																											// 16: bottom-front
		 0.5, -0.5, -0.5,																											// 17: bottom-back
		 0.5,  0.5, -0.5,																											// 18: top-back
		 0.5,  0.5,  0.5,																											// 19: top-front

		// Left face (−X)
		-0.5, -0.5,  0.5,																											// 20: bottom-front
		-0.5,  0.5,  0.5,																											// 21: top-front
		-0.5,  0.5, -0.5,																											// 22: top-back
		-0.5, -0.5, -0.5																											// 23: bottom-back
	];

	// Normals (N): one normal per vertex
	const N = [																														// xyz triplets
		// Front (+Z)
		0, 0, 1,	0, 0, 1,	0, 0, 1,	0, 0, 1,

		// Back (−Z)
		0, 0,-1,	0, 0,-1,	0, 0,-1,	0, 0,-1,

		// Top (+Y)
		0, 1, 0,	0, 1, 0,	0, 1, 0,	0, 1, 0,

		// Bottom (−Y)
		0,-1, 0,	0,-1, 0,	0,-1, 0,	0,-1, 0,

		// Right (+X)
		1, 0, 0,	1, 0, 0,	1, 0, 0,	1, 0, 0,

		// Left (−X)
		-1, 0, 0,	-1, 0, 0,	-1, 0, 0,	-1, 0, 0
	];

	// BL = bottom-left, BR = bottom-right, TR = top-right, TL = top-left
	function BL(uv) { 
        return [uv[0], uv[1]]; 
    }
	function BR(uv) { 
        return [uv[2], uv[1]]; 
    }
	function TR(uv) { 
        return [uv[2], uv[3]]; 
    }
	function TL(uv) { 
        return [uv[0], uv[3]]; 
    }

	const T = [];																													// Will fill with [u,v] pairs in the same vertex order as P

	// Face 0: Front (+Z) -> order: BL, BR, TR, TL using UV_SIDE
	{
		const bl = BL(UV_SIDE); const br = BR(UV_SIDE); const tr = TR(UV_SIDE); const tl = TL(UV_SIDE);
		T.push(bl[0], bl[1]); T.push(br[0], br[1]); T.push(tr[0], tr[1]); T.push(tl[0], tl[1]);
	}

	// Face 1: Back (−Z) -> order: BR, TR, TL, BL using UV_SIDE (mirrored to keep consistent winding)
	{
		const br = BR(UV_SIDE); const tr = TR(UV_SIDE); const tl = TL(UV_SIDE); const bl = BL(UV_SIDE);
		T.push(br[0], br[1]); T.push(tr[0], tr[1]); T.push(tl[0], tl[1]); T.push(bl[0], bl[1]);
	}

	// Face 2: Top (+Y) -> order: BL, BR, TR, TL using UV_TOP
	{
		const bl = BL(UV_TOP); const br = BR(UV_TOP); const tr = TR(UV_TOP); const tl = TL(UV_TOP);
		T.push(bl[0], bl[1]); T.push(br[0], br[1]); T.push(tr[0], tr[1]); T.push(tl[0], tl[1]);
	}

	// Face 3: Bottom (−Y) -> order: BR, TR, TL, BL using UV_BOTTOM (mirrored)
	{
		const br = BR(UV_BOTTOM); const tr = TR(UV_BOTTOM); const tl = TL(UV_BOTTOM); const bl = BL(UV_BOTTOM);
		T.push(br[0], br[1]); T.push(tr[0], tr[1]); T.push(tl[0], tl[1]); T.push(bl[0], bl[1]);
	}

	// Face 4: Right (+X) -> order: BL, BR, TR, TL using UV_SIDE
	{
		const bl = BL(UV_SIDE); const br = BR(UV_SIDE); const tr = TR(UV_SIDE); const tl = TL(UV_SIDE);
		T.push(bl[0], bl[1]); T.push(br[0], br[1]); T.push(tr[0], tr[1]); T.push(tl[0], tl[1]);
	}

	// Face 5: Left (−X) -> order: BR, TR, TL, BL using UV_SIDE (mirrored)
	{
		const br = BR(UV_SIDE); const tr = TR(UV_SIDE); const tl = TL(UV_SIDE); const bl = BL(UV_SIDE);
		T.push(br[0], br[1]); T.push(tr[0], tr[1]); T.push(tl[0], tl[1]); T.push(bl[0], bl[1]);
	}

	// Indices (I): 12 triangles (2 per face × 6 faces)
	const I = [];																													// 36 indices total
	for (let f = 0; f < 6; f++) {																									// For each face
		const b = f * 4;																											// Base index of this face in P/T/N
		I.push(b + 0, b + 1, b + 2);																								// First triangle
		I.push(b + 0, b + 2, b + 3);																								// Second triangle
	}
	return {
		pos: new Float32Array(P),																									// Vertex positions
		nor: new Float32Array(N),																									// Vertex normals
		uv:  new Float32Array(T),																									// Vertex UVs
		idx: new Uint16Array(I),																									// Triangle indices
		triCount: 12																												// 6 faces × 2 triangles
	};
}


// rotation-aware atlas cube
function buildAtlasCube(tiles) {
	// Build a unique cache key so the same tile reuses the same GPU buffers
	const key =
		"t:" + tiles.top + // top tile [col,row]
		"|s:" + tiles.side + // side tile [col,row]
		"|b:" + tiles.bottom + // bottom tile [col,row]
		"|rt:" + (tiles.rotTop || 0) + // top UV clockwise rotation in degrees
		"|rb:" + (tiles.rotBottom || 0) + // bottom UV clockwise rotation in degrees
		"|rs:" + (tiles.rotSide || 0); // side  UV clockwise rotation in degrees

	// If we already built this exact cube before, return the cached mesh
	if (cubeMeshCache.has(key)) {
		return cubeMeshCache.get(key);
	}


	// 6 faces * 4 vertices per face = 24 vertices - similar to building the minecraft block
	const P = [
		// +Z (front) face
		-0.5, -0.5,  0.5,
		 0.5, -0.5,  0.5,
		 0.5,  0.5,  0.5,
		-0.5,  0.5,  0.5,

		// -Z (back) face
		-0.5, -0.5, -0.5,
		-0.5,  0.5, -0.5,
		 0.5,  0.5, -0.5,
		 0.5, -0.5, -0.5,

		// +Y (top) face
		-0.5,  0.5,  0.5,
		 0.5,  0.5,  0.5,
		 0.5,  0.5, -0.5,
		-0.5,  0.5, -0.5,

		// -Y (bottom) face
		-0.5, -0.5,  0.5,
		-0.5, -0.5, -0.5,
		 0.5, -0.5, -0.5,
		 0.5, -0.5,  0.5,

		// +X (right) face
		 0.5, -0.5,  0.5,
		 0.5, -0.5, -0.5,
		 0.5,  0.5, -0.5,
		 0.5,  0.5,  0.5,

		// -X (left) face
		-0.5, -0.5,  0.5,
		-0.5,  0.5,  0.5,
		-0.5,  0.5, -0.5,
		-0.5, -0.5, -0.5
	];

	const N = [
		// +Z
		0, 0,  1,   0, 0,  1,   0, 0,  1,   0, 0,  1,
		// -Z
		0, 0, -1,   0, 0, -1,   0, 0, -1,   0, 0, -1,
		// +Y
		0, 1,  0,   0, 1,  0,   0, 1,  0,   0, 1,  0,
		// -Y
		0, -1, 0,   0, -1, 0,   0, -1, 0,   0, -1, 0,
		// +X
		1, 0,  0,   1, 0,  0,   1, 0,  0,   1, 0,  0,
		// -X
		-1, 0, 0,  -1, 0,  0,  -1, 0,  0,  -1, 0,  0
	];

	// Compute the base tile rectangles (u0,v0,u1,v1) from [col,row]
	const uvTopBase = tileUV(tiles.top[0], tiles.top[1]);
	const uvSideBase = tileUV(tiles.side[0], tiles.side[1]);
	const uvBottomBase = tileUV(tiles.bottom[0], tiles.bottom[1]);

	// Read rotation angles (clockwise degrees), defaulting to 0
	const rotSide = tiles.rotSide || 0;
	const rotTop = tiles.rotTop || 0;
	const rotBottom = tiles.rotBottom || 0;

	// Rotate each face’s 4 UV corners as needed
	const uvPosZ = rotQuadCW(uvSideBase, rotSide);  
	const uvNegZ = rotQuadCW(uvSideBase, rotSide); 
	const uvPosY = rotQuadCW(uvTopBase, rotTop);  
	const uvNegY = rotQuadCW(uvBottomBase, rotBottom); 
	const uvPosX = rotQuadCW(uvSideBase, rotSide);   
	const uvNegX = rotQuadCW(uvSideBase, rotSide);  
	
    
	const T = new Float32Array(6 * 8); 
	let tOff = 0;
	T.set(uvPosZ, tOff); tOff += 8; // +Z
	T.set(uvNegZ, tOff); tOff += 8; // -Z
	T.set(uvPosY, tOff); tOff += 8; // +Y
	T.set(uvNegY, tOff); tOff += 8; // -Y
	T.set(uvPosX, tOff); tOff += 8; // +X
	T.set(uvNegX, tOff); // -X


	const I = [];
	for (let face = 0; face < 6; face++) {
		const b = face * 4; 
		I.push(
			b, b + 1, b + 2,  // first triangle
			b, b + 2, b + 3   // second triangle
		);
	}

	const mesh = {
		pos:      new Float32Array(P),
		nor:      new Float32Array(N),
		uv:       T,
		idx:      new Uint16Array(I),
		triCount: 12
	};

	// Cache it so future calls with same tiles/rotations are instant
	cubeMeshCache.set(key, mesh);

	// Return the freshly built (or cached) cube mesh
	return mesh;
}

//bind the buffers for the cube
function uploadCube(mesh) {
    const out={ vbo:gl.createBuffer(), nbo:gl.createBuffer(), tbo:gl.createBuffer(), ibo:gl.createBuffer(), count:mesh.triCount*3 };
    gl.bindBuffer(gl.ARRAY_BUFFER,out.vbo); 
    gl.bufferData(gl.ARRAY_BUFFER,mesh.pos,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,out.nbo); 
    gl.bufferData(gl.ARRAY_BUFFER,mesh.nor,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,out.tbo); 
    gl.bufferData(gl.ARRAY_BUFFER,mesh.uv,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,out.ibo); 
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.idx,gl.STATIC_DRAW);
    return out;
}

// tile helpers
const T = n => idxToCR(n);
const CUBE = n => ({ top:T(n), side:T(n), bottom:T(n) });

const STONE = CUBE(1);
const COBBLE = CUBE(17);
const LOG = { top:T(22), side:T(21), bottom:T(22) };
const PLANK = CUBE(5);
const GLASS = CUBE(68);
const FURN = { top:T(45),  side:T(45),  bottom:T(45),  rotSide:90 };
const PUMPKIN = { top:T(119), side:T(120), bottom:T(119), rotSide:90 };
const LEAF = CUBE(80);
const BRICK = CUBE(7);
const FLOWER_TILES = [16,14,13,38,39];
const BAMBOO_TILE = 74;

function addCube(o){ 
    WORLD.push(o); 
}


/**
 * Places a plant made from two crossed quads (an X shape) so it looks
 * volumetric from most angles
 */
function addPlant(x, y, z, idx) {
	const [c, r] = idxToCR(idx);
	const uv = tileUV(c, r);

	// First quad faces X axis 
	// scale x is tiny (~0) to keep it paper-thin, y and z are full size.
	// keyWhite = true means we’ll chroma-key out white pixels
	WORLD.push({
		kind: "billboardX",
		pos: [x, y, z],
		uv,
		scale: [0.001, 1, 1],
		useAtlas: true,
		keyWhite: true
	});

	// Second quad faces Z axis 
	// Together with the X-facing quad, this forms a cross
	WORLD.push({
		kind: "billboardZ",
		pos: [x, y, z],
		uv,
		scale: [1, 1, 0.001],
		useAtlas: true,
		keyWhite: true
	});
}

/**
 * Adds a single flat wall-aligned quad on the Z plane --mainly for window and door
 */
function addFlatQuadZ(x, y, z, w, h, idx, facingMinusZ = true, keyWhite = false) {
	const [c, r] = idxToCR(idx);
	const uv = tileUV(c, r);

	WORLD.push({
		kind: "wallZ",
		pos: [x, y, z],
		size: [w, h],
		uv,
		facingMinusZ,
		keyWhite
	});
}

/**
 * Spawns a random flower at ground height using two crossed plant
 */
function addFlower(x, z) {
	// Pick a random flower tile id from the FLOWER_TILES array
	const idx = FLOWER_TILES[Math.floor(Math.random() * FLOWER_TILES.length)];

	// Place the crossed-quads plant at half-block height so it sits on the ground
	addPlant(x, 0.5, z, idx);
}

/**
 * Stacks multiple billboard plants vertically to fake a tall bamboo stalk
 */
function addBamboo(x, z, h = 4) {
	for (let i = 0; i < h; i++) {
		addPlant(x, 0.5 + i, z, BAMBOO_TILE);
	}
}


/**
 * Builds a tree with a blocky trunk and a few leaf layers 
 */
function addTreeBetter(x, z) {
	// Random trunk height between 4 and 6 blocks to add variety
	const trunkH = 4 + Math.floor(Math.random() * 3);

	// Build the trunk: a vertical column of LOG cubes starting at y = 1
	for (let h = 0; h < trunkH; h++) {
		addCube({
			kind: "cube",
			pos: [x, 1 + h, z],
			useAtlas: true,
			tiles: LOG,
			scale: [1, 1, 1]
		});
	}

	const centerY = 1 + trunkH;

	// Define leaf layers around the top:
	// - two layers with radius 2
	// - one top layer with radius 1
	const layers = [
		{ y: centerY, r: 2 },
		{ y: centerY + 1, r: 2 },
		{ y: centerY + 2, r: 1 }
	];

	// For each layer, fill a diamond-ish shape using Manhattan distance
	layers.forEach(L => {
		for (let dx = -L.r; dx <= L.r; dx++) {
			for (let dz = -L.r; dz <= L.r; dz++) {
				if (Math.abs(dx) + Math.abs(dz) <= L.r + 1) {
					addCube({
						kind: "cube",
						pos: [x + dx, L.y, z + dz],
						useAtlas: true,
						tiles: LEAF,  
						scale: [1, 1, 1],
						keyWhite: true 
					});
				}
			}
		}
	});

	// Add a final leaf block at the very top for a pointy crown
	addCube({
		kind: "cube",
		pos: [x, centerY + 3, z],
		useAtlas: true,
		tiles: LEAF,
		scale: [1, 1, 1],
		keyWhite: true
	});
}


// build world (house untouched, heavy flora)
function buildWorld(){
    WORLD.length=0;

    // single grass layer for the ground
    for(let x=0;x<WORLD_SIZE;x++)
        for(let z=0;z<WORLD_SIZE;z++)
            addCube(
                {kind:'cube', pos:[x + 1.5, 0, z + 0.5], useAtlas:false, meshKey:'grass', scale:[1,1,1]});

    // house 
    const H0 = [Math.floor(WORLD_SIZE / 2) - 2, 0, Math.floor(WORLD_SIZE / 2) - 3];

    // foundation for house - STONE
    for(let x = 0; x <= 4; x++){
        addCube({kind:'cube', pos:[H0[0] + x, 1, H0[2]], useAtlas:true, tiles:COBBLE, scale:[1,1,1]});
        addCube({kind:'cube', pos:[H0[0] + x, 1, H0[2] + 4], useAtlas:true, tiles:COBBLE, scale:[1,1,1]});
    }
    for(let z = 1; z <= 3; z++){
        addCube({kind:'cube', pos:[H0[0],1,H0[2]+z],   useAtlas:true, tiles:COBBLE, scale:[1,1,1]});
        addCube({kind:'cube', pos:[H0[0]+4,1,H0[2]+z], useAtlas:true, tiles:COBBLE, scale:[1,1,1]});
    }

    // log corners
    [[0,0],[4,0],[0,4],[4,4]].forEach(([dx,dz])=>{
    for(let h = 1;h <= 4; h++)
        addCube({kind:'cube', pos:[H0[0]+dx, h, H0[2]+dz], useAtlas:true, tiles:LOG, scale:[1,1,1], rotY: Math.PI / 2});
    });

    // plank walls
    for(let x=1;x<=3;x++) for(let h=2;h<=3;h++)
        addCube({kind:'cube', pos:[H0[0]+x,h,H0[2]], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});
    for(let x=1;x<=3;x++) for(let h=2;h<=3;h++)
        addCube({kind:'cube', pos:[H0[0]+x,h,H0[2]+4], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});
    for(let z=1;z<=3;z++) for(let h=2;h<=3;h++)
        addCube({kind:'cube', pos:[H0[0],h,H0[2]+z], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});
    for(let z=1;z<=3;z++) for(let h=2;h<=3;h++)
        addCube({kind:'cube', pos:[H0[0]+4,h,H0[2]+z], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});

    // windows
    addCube({kind:'cube', pos:[H0[0]+1,3,H0[2]],   useAtlas:true, tiles:GLASS, scale:[1,1,1]});
    addCube({kind:'cube', pos:[H0[0]+3,3,H0[2]],   useAtlas:true, tiles:GLASS, scale:[1,1,1]});
    addCube({kind:'cube', pos:[H0[0]+2,3,H0[2]+4], useAtlas:true, tiles:GLASS, scale:[1,1,1]});
    
    const fZ = H0[2] - 0.51;
    addFlatQuadZ(H0[0]+1, 2, fZ, 1, 1, 85, true, false);
    addFlatQuadZ(H0[0]+3, 2, fZ, 1, 1, 85, true, false);
    addFlatQuadZ(H0[0]+2, 1, fZ, 1, 1, 98, true, false);
    addFlatQuadZ(H0[0]+2, 2, fZ, 1, 1, 82, true, false);

    // porch path
    for(let k=1;k<=3;k++)
        addCube({kind:'cube', pos:[H0[0]+2,0,H0[2]-k], useAtlas:true, tiles:COBBLE, scale:[1,0.3,1]});

    // A-frame roof (wood)
    const zMin = H0[2]-1, zMax = H0[2]+5;
    for (let layer = 0; layer < 3; layer++) {
        const y  = 4 + layer;
        const xL = H0[0] - 1 + layer;
        const xR = H0[0] + 5 - layer;

        for (let z = zMin; z <= zMax; z++) {
            addCube({kind:'cube', pos:[xL, y, z], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});
            addCube({kind:'cube', pos:[xR, y, z], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});
        }
        for (let x = xL; x <= xR; x++) {
            addCube({kind:'cube', pos:[x, y, H0[2]-1], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});
            addCube({kind:'cube', pos:[x, y, H0[2]+5], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});
        }
        for (let z = H0[2]; z <= H0[2]+4; z++)
            for (let x = xL+1; x <= xR-1; x++)
                addCube({kind:'cube', pos:[x, y, z], useAtlas:true, tiles:PLANK, scale:[1,0.8,1], rotY: Math.PI / 2});
    }
    
    for (let z = zMin; z <= zMax; z++)
        addCube({kind:'cube', pos:[H0[0]+2, 7, z], useAtlas:true, tiles:PLANK, scale:[1,1,1], rotY: Math.PI / 2});

    // chimney
    for(let h=4; h<=7; h++)
        addCube({kind:'cube', pos:[H0[0]+4,h,H0[2]+1], useAtlas:true, tiles:BRICK, scale:[1,1,1]});
        addCube({kind:'cube', pos:[H0[0]+4,8,H0[2]+1], useAtlas:true, tiles:STONE, scale:[1,1,1]});

    // pumpkin + furnace
    addCube({kind:'cube', pos:[H0[0]+3,1,H0[2]-2], useAtlas:true, tiles:PUMPKIN, scale:[1,1,1]});
    addCube({kind:'cube', pos:[H0[0]+1,1,H0[2]-2], useAtlas:true, tiles:FURN, scale:[1,1,1]});


    // back tree line
    const backZ = WORLD_SIZE - 6;
    for(let t=0;t<7;t++) 
        addTreeBetter(2 + t*((WORLD_SIZE-4)/7), backZ);

    // keep-clear zone around the house
    const keepClear = (x,z) => {
        const hx0 = H0[0]-3, hx1 = H0[0]+7;
        const hz0 = H0[2]-4, hz1 = H0[2]+7;
        return (x>=hx0 && x<=hx1 && z>=hz0 && z<=hz1);
    };

    // extra nicer trees
    for (let i=0; i<10; i++){
        const tx = 2 + Math.floor(Math.random()*(WORLD_SIZE-4));
        const tz = 2 + Math.floor(Math.random()*(WORLD_SIZE-6));
        if (keepClear(tx,tz)) continue;
        if (Math.abs(tx - (H0[0]+2)) < 3 && tz < H0[2]+1) continue;
        addTreeBetter(tx+0.5, tz+0.5);
    }
}

// drawing helpers
function drawCubeObject(obj){
    let buffers, useAtlasTex=false;
    if(obj.useAtlas){ 
        buffers=uploadCube(buildAtlasCube(obj.tiles)); 
        useAtlasTex=true; 
    }
    else { 
        buffers = cubeParts; 
        useAtlasTex=false; 
    }

    const M = mat4.create();
    mat4.fromTranslation(M, vec3.fromValues(obj.pos[0],obj.pos[1],obj.pos[2]));
    // apply optional per-axis rotations
    if (obj.rotX) 
        mat4.rotateX(M, M, obj.rotX);
    if (obj.rotY) 
        mat4.rotateY(M, M, obj.rotY);
    if (obj.rotZ) 
        mat4.rotateZ(M, M, obj.rotZ);

    mat4.multiply(M,M,mat4.fromScaling(mat4.create(), vec3.fromValues(obj.scale[0],obj.scale[1],obj.scale[2])));

    const p=mat4.create(), v=mat4.create(), pvm=mat4.create();
    mat4.perspective(p, 0.5*Math.PI, 1, 0.1, 100);
    mat4.lookAt(v, Eye, Center, Up);
    mat4.multiply(pvm,p,v); mat4.multiply(pvm,pvm,M);

    gl.uniformMatrix4fv(mMatrixULoc,false,M);
    gl.uniformMatrix4fv(pvmMatrixULoc,false,pvm);
    gl.uniform3fv(ambientULoc, vec3.fromValues(0.35,0.35,0.35));
    gl.uniform3fv(diffuseULoc, vec3.fromValues(0.85,0.85,0.85));
    gl.uniform3fv(specularULoc, vec3.fromValues(0,0,0));
    gl.uniform1f(shininessULoc, 16.0);
    gl.uniform1f(alphaULoc, obj.alpha ?? 1.0);
    gl.uniform1i(uKeyEnableULoc, obj.keyWhite ? 1 : 0);

    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.vbo); gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.nbo); gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.tbo); gl.vertexAttribPointer(texCoordAttribLoc,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers.ibo);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, useAtlasTex ? atlasTexture : blockTexture);

    gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);

    if (obj.keyWhite) 
        gl.uniform1i(uKeyEnableULoc, 0);
}
function drawWallZ(obj){
    const [l,b,r,t] = obj.uv;
    const z = obj.pos[2];
    const x = obj.pos[0], y = obj.pos[1], w = obj.size[0], h = obj.size[1];
    const s = obj.facingMinusZ ? -1 : +1;
    const P = new Float32Array([ x-0.5*w, y+0,   z, x-0.5*w, y+h,   z, x+0.5*w, y+h,   z, x+0.5*w, y+0,   z ]);
    const N = new Float32Array([ 0,0,s, 0,0,s, 0,0,s, 0,0,s ]);
    const Tuv = new Float32Array([ l,b, l,t, r,t, r,b ]);
    const I = new Uint16Array(obj.facingMinusZ ? [0,1,2, 0,2,3] : [0,2,1, 0,3,2]);

    const q={vbo:gl.createBuffer(),nbo:gl.createBuffer(),tbo:gl.createBuffer(),ibo:gl.createBuffer(),count:6};
    gl.bindBuffer(gl.ARRAY_BUFFER,q.vbo); gl.bufferData(gl.ARRAY_BUFFER,P,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,q.nbo); gl.bufferData(gl.ARRAY_BUFFER,N,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,q.tbo); gl.bufferData(gl.ARRAY_BUFFER,Tuv,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,q.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,I,gl.STATIC_DRAW);

    const M=mat4.create();
    mat4.multiply(M,M,mat4.fromTranslation(mat4.create(), vec3.fromValues(0,0, obj.facingMinusZ ? -0.01 : +0.01)));

    const p=mat4.create(), v=mat4.create(), pvm=mat4.create();
    mat4.perspective(p, 0.5*Math.PI, 1, 0.1, 100);
    mat4.lookAt(v, Eye, Center, Up);
    mat4.multiply(pvm,p,v); mat4.multiply(pvm,pvm,M);

    gl.uniformMatrix4fv(mMatrixULoc,false,M);
    gl.uniformMatrix4fv(pvmMatrixULoc,false,pvm);
    gl.uniform3fv(ambientULoc, vec3.fromValues(0.45,0.45,0.45));
    gl.uniform3fv(diffuseULoc,  vec3.fromValues(0.9,0.9,0.9));
    gl.uniform3fv(specularULoc, vec3.fromValues(0,0,0));
    gl.uniform1f(shininessULoc, 4.0);
    gl.uniform1f(alphaULoc, 1.0);

    gl.uniform1i(uKeyEnableULoc, obj.keyWhite ? 1 : 0);
    gl.uniform3f(uKeyColorULoc, 1.0,1.0,1.0);
    gl.uniform1f(uKeyThreshULoc, 0.33);

    gl.bindBuffer(gl.ARRAY_BUFFER,q.vbo); gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,q.nbo); gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,q.tbo); gl.vertexAttribPointer(texCoordAttribLoc,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,q.ibo);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.drawElements(gl.TRIANGLES, q.count, gl.UNSIGNED_SHORT, 0);

    gl.uniform1i(uKeyEnableULoc, 0);
}

function drawTransparency(obj){
    const [l,b,r,t] = obj.uv;
    let P,N;
    if (obj.kind==='billboardX'){
        P = new Float32Array([0,0,-0.5, 0,1.0,-0.5, 0,1.0,0.5, 0,0,0.5]);
        N = new Float32Array([1,0,0,1,0,0,1,0,0,1,0,0]);
    } else {
        P = new Float32Array([-0.5,0,0, -0.5,1.0,0, 0.5,1.0,0, 0.5,0,0]);
        N = new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]);
    }
    const Tuv = new Float32Array([l,b, l,t, r,t, r,b]);
    const I = new Uint16Array([0,1,2, 0,2,3]);

    const q={vbo:gl.createBuffer(),nbo:gl.createBuffer(),tbo:gl.createBuffer(),ibo:gl.createBuffer(),count:6};
    gl.bindBuffer(gl.ARRAY_BUFFER,q.vbo); gl.bufferData(gl.ARRAY_BUFFER,P,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,q.nbo); gl.bufferData(gl.ARRAY_BUFFER,N,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,q.tbo); gl.bufferData(gl.ARRAY_BUFFER,Tuv,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,q.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,I,gl.STATIC_DRAW);

    const M=mat4.create();
    const p=mat4.create(), v=mat4.create(), pvm=mat4.create();
    mat4.perspective(p, 0.5*Math.PI, 1, 0.1, 100);
    mat4.lookAt(v, Eye, Center, Up);
    mat4.multiply(pvm,p,v); mat4.multiply(pvm,pvm,M);

    gl.uniformMatrix4fv(mMatrixULoc,false,M);
    gl.uniformMatrix4fv(pvmMatrixULoc,false,pvm);
    gl.uniform3fv(ambientULoc, vec3.fromValues(0.4,0.4,0.4));
    gl.uniform3fv(diffuseULoc, vec3.fromValues(0.9,0.9,0.9));
    gl.uniform3fv(specularULoc, vec3.fromValues(0,0,0));
    gl.uniform1f(shininessULoc, 4.0);
    gl.uniform1f(alphaULoc, 1.0);

    gl.uniform1i(uKeyEnableULoc, obj.keyWhite ? 1 : 0);
    gl.uniform3f(uKeyColorULoc, 1.0,1.0,1.0);
    gl.uniform1f(uKeyThreshULoc, 0.33);

    gl.bindBuffer(gl.ARRAY_BUFFER,q.vbo); gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,q.nbo); gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,q.tbo); gl.vertexAttribPointer(texCoordAttribLoc,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,q.ibo);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.drawElements(gl.TRIANGLES, q.count, gl.UNSIGNED_SHORT, 0);

    gl.uniform1i(uKeyEnableULoc, 0);
}

// init Minecraft assets
function ensureMinecraftReady() {
    if (mcReady) 
        return;
    if (!atlasTexture) 
        atlasTexture = loadTexture(gl, ATLAS_URL);
    if (!blockTexture) 
        blockTexture = loadTexture(gl, MCBLOCK_URL);
    if (!cubeParts || !cubeParts.vbo) 
        cubeParts = uploadCube(buildCubeFromMinecraftBlock());
    buildWorld();
    mcReady = true;
}

// toggle worlds 
function toggleMinecraft() {
    if (gWorldMode === MODE_STANDARD) {
        savedStdCam.Eye = vec3.clone(Eye);
        savedStdCam.Center = vec3.clone(Center);
        savedStdCam.Up = vec3.clone(Up);
        savedStdCam.viewDelta = viewDelta;

        ensureMinecraftReady();
        vec3.copy(Eye, mcDefaultEye);
        vec3.copy(Center, mcDefaultCenter);
        vec3.copy(Up, mcDefaultUp);
        viewDelta = mcViewDelta;

        gWorldMode = MODE_MINECRAFT;
    } else {
        vec3.copy(Eye, savedStdCam.Eye);
        vec3.copy(Center, savedStdCam.Center);
        vec3.copy(Up, savedStdCam.Up);
        viewDelta = savedStdCam.viewDelta || viewDelta;
        gWorldMode = MODE_STANDARD;
    }
}

/* MAIN -- HERE is where execution begins after window load */
function main() {
  
  setupWebGL(); // set up the webGL environment
  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  loadModels(); // load in the models from tri file
  setupShaders(); // setup the webGL shaders

  renderModels(); // draw the triangles using webGL
} // end main
