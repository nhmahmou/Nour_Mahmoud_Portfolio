/**
 * Resources for Phong Lighting - https://www.youtube.com/watch?v=33gn3_khXxw
 */

/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space

const INPUT_TRIANGLES_URL = "triangles.json";
const INPUT_TRIANGLES_URL_2 = "triangles2.json"; // triangles file loc
 // triangles file loc
const INPUT_ELLIPSOIDS_URL = "ellipsoids.json";
//const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog3/spheres.json"; // spheres file loc


var Eye = vec4.fromValues(0.5, 0.5, -0.5, 1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!

//buffers
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var colorBuffer;
var normalBuffer;


var triBufferSize; // the number of indices in the triangle buffer

var altPosition; // flag indicating whether to alter vertex positions
var altPositionUniform; // where to put altPosition flag for vertex shader

var vertexColorAttrib;
var vertexPositionAttrib; // where to put position for vertex shader
var vertexNormalAttrib;

var modelViewMatrixUniform;
var projectionMatrixUniform;
var normalMatrixUniform;

var uLightPosEye;
var uKa, uKs, uShininess;

var drawSets = [];

//Part 5
var selectedSet = 1; // -1 means "none selected"
var modelMatrices = []; // per-set transform matrix (for Part 6)
var highlightScales = []; // per-set highlight scale (1.0 or 1.2)
var gViewMatrix = mat4.create(); // current view matrix for this frame


// Part 6 state
var modelRotations = [];    // per-set rotation matrix (mat4)
var modelTranslations = []; // per-set translation vector (vec3)


//EC
//Ellipsoid mesh buffers
var ellipsoidMesh = {
	positionBuffer: null, //vertex positions
	normalBuffer: null, //vertex normals
	colorBuffer: null, //vertex colors 
	indexBuffer: null, //triangle indices
	indexCount: 0,
	vertexCount: 0
};
var ellipsoidDrawList = [];	

//Simple render-mode switch 
var renderMode = 'triangles';	// 'triangles' | 'ellipsoids'

//Black-Hole scene toggle "!"
var BH_ON = false;


//Black Hole
var BH_CENTER = vec3.fromValues(0.5, 0.5, 0.8);	// where the hole lives
var BH_RADIUS = 0.38;
// Ring rendering controls
var RING_SEGMENTS	= 50;		// smooth circles
var RING_THICKNESS	= 0.0095;	// very thin: fraction of radius

var BH_MAT = {// almost black
	ambient: [0.0, 0.0, 0.0],
	diffuse: [0.02, 0.02, 0.02],
	specular: [0.0, 0.0, 0.0],
	n: 8
};

var ringMesh = {
	positionBuffer: null,
	normalBuffer: null,
	colorBuffer: null,
	indexBuffer: null,
	indexCount: 0,
	vertexCount: 0
};

//Stars (background)
var starPositionBuffer = null;
var starColorBuffer = null;
var starNormalBuffer = null;
var starCount = 0;

// shader toggles
var uUnlit = null;
var uPointSize = null;


//Camera state for part 4
var camera = {
    eye: vec3.fromValues(0.5, 0.5, -0.5), // where the viewer is
    dir: vec3.fromValues(0, 0, 1), // lookAt
    up: vec3.fromValues(0, 1, 0), // view up 
    moveStep: 0.05, // how far to move per key tap
    rotStep: Math.PI / 90 // how much to rotate per key tap
};

//this highlights the shape and makes it bigger - otherwise keep normal size
function setHighlight(i, on) {
    if(on){
        highlightScales[i] = 1.2;
    } else {
        highlightScales[i] = 1.0;
    }
}

//clear what is selected
function clearSelection() {
    if (selectedSet >= 0) 
        setHighlight(selectedSet, false);
    selectedSet = -1;
}

//select the next element in the draw set
function selectNext(dir) {
    if (!drawSets.length) 
        return;
    if (selectedSet >= 0) 
        setHighlight(selectedSet, false);
    // wrap around: 0..n-1 -- this is like a circular array where you make it wrap around
    
    selectedSet = (((selectedSet + dir) % drawSets.length) + drawSets.length) % drawSets.length;
    //console.log("Selected set is" + selectedSet);
    setHighlight(selectedSet, true);
}

//process keypresses
function onKeyDown(e){
    if (e.key === '!') {
		BH_ON = !BH_ON;
		e.preventDefault();
		return;	
	}
  
    const {u, v, w} = getViewAxes(camera);
    const m = camera.moveStep;
    const r = camera.rotStep;

    switch (e.key) {
        // translate along view axes
        case 'a': 
            moveAlong(u, -m); 
            break; //left
        case 'd': 
            moveAlong(u, m); 
            break; //right
        case 'q': 
            moveAlong(v, -m); 
            break; //down
        case 'e': 
            moveAlong(v,  m); 
            break; // up
        case 'w': 
            moveAlong(w,  m); 
            break; // forward
        case 's': 
            moveAlong(w, -m); 
            break; // back

        // rotate (SHIFT gives uppercase letters)
        case 'A': 
            yawCamera(-r); 
            break; // yaw left
        case 'D': 
            yawCamera( r); 
            break; // yaw right
        case 'W': 
            pitchCamera( r); 
            break; // look up
        case 'S': 
            pitchCamera(-r); 
            break; // look down

        case 'ArrowRight': 
            selectNext(1); 
            break;  // next set
        case 'ArrowLeft':  
            selectNext(-1); 
            break;  // previous set
        case ' ':          
            clearSelection(); 
            break;
        case 'E':
	        loadEllipsoidsFromJSON();
	        renderMode = 'ellipsoids';
	        break;

        case 'R':
            renderMode = 'triangles';
            BH_ON = false;
            break;

        default: 
            break; // ignore other keys
    }
    if (selectedSet >= 0) {
        const set = drawSets[selectedSet];
        const T = modelTranslations[selectedSet];
        const R = modelRotations[selectedSet];
        const {u, v, w} = getViewAxes(camera);

        const tStep = 0.05;   
        const rStep = Math.PI / 36;

        // helper: add translation along a world axis
        function move(axis, amount){
            vec3.scaleAndAdd(T, T, axis, amount);
        }

        // helper: rotate around a VIEW (world) axis - PRE multiply so it’s truly “around view X/Y/Z”
        function rotateWorldAxis(axis, angle){
            const Rinc = mat4.create();
            mat4.fromRotation(Rinc, angle, axis);   // build incremental rotation
            mat4.multiply(R, Rinc, R);              
        }

        switch (e.key) {
            // translation (k ; o l i p)
            case 'k': 
                move(u, -tStep); 
                break;
            case ';': 
                move(u,  tStep); break;
            case 'o':
                move(w,  tStep); 
                break;
            case 'l': 
                move(w, -tStep); 
                break;
            case 'i': 
                move(v,  tStep); 
                break;
            case 'p': 
                move(v, -tStep); 
                break;

            // rotation around VIEW axes 
            case 'K': 
                rotateWorldAxis(v,  rStep);  
                break; //yaw left 
            case ':': 
                rotateWorldAxis(v, -rStep);  
                break; //yaw right
            case 'O': 
                rotateWorldAxis(u,  rStep);  
                break; 
            case 'L': 
                rotateWorldAxis(u, -rStep);  
                break; 
            case 'I': 
                rotateWorldAxis(w, -rStep);  
                break; 
            case 'P': 
                rotateWorldAxis(w,  rStep);  
                break; 
        }
    }
    // prevent the page from scrolling on space/arrow, etc.
    e.preventDefault();
}


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
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL


function parseCenter(e) {
  const x = e.x, y = e.y, z = e.z;
  return ([x, y, z]);
}


// load the ellipsoid from the json using getJSONFIle
function loadEllipsoidsFromJSON(){
	let data = getJSONFile(INPUT_ELLIPSOIDS_URL, "ellipsoids");
	//default to local if url doesnt work
    if (!data) 
        data = getJSONFile("ellipsoids.json", "ellipsoids");

	if (!data || !Array.isArray(data)) {
		console.log("No ellipsoids found or bad JSON format.");
		return;
	}

	ellipsoidDrawList.length = 0;
	for (let i = 0; i < data.length; i++){
		const e = data[i];

		//Center
		const center = parseCenter(e);

		//Radii
		const rx = e.a;
		const ry = e.b;
		const rz = e.c;
		const radii = [Math.max(0.001, rx), Math.max(0.001, ry), Math.max(0.001, rz)];

		//Material 
		const material = {
			ambient: e.ambient,
			diffuse: e.diffuse,
			specular: e.specular,
			n: e.n
		};

		ellipsoidDrawList.push({ center, radii, material });
	}

	renderMode = 'ellipsoids';
}

// Build a mesh where every triangle has its own 3 vertices that all share the SAME normal.
function buildExpandedMesh(inputTriangles) {
    // These are the arrays we’ll fill up and return:
    const positions = [];
    const normals   = []; // nx,ny,nz (same one repeated per triangle corner)
    const kdArray   = []; // diffuse color per vertex (from material.diffuse)
    const indices   = []; 
    const drawSets  = []; // one entry per triangle set: { startIndex, indexCount, material }

    let cursor = 0; // how many vertices we’ve created so far (for indexing)

    // Walk each triangle SET from the JSON
    for (let s = 0; s < inputTriangles.length; s++) {
        const set = inputTriangles[s]; // the current block (has vertices, triangles, material)
        
        const V = set.vertices; 

        //compute center for this set from its vertices
        let cx = 0, cy = 0, cz = 0;
        for (let i = 0; i < V.length; i++) { 
            cx += V[i][0]; cy += V[i][1]; cz += V[i][2]; 
        }
        cx /= V.length; cy /= V.length; cz /= V.length;


        const T = set.triangles;
        const kd = set.material.diffuse; // we’ll use this as Kd per vertex
        const mat = set.material; // keep whole material for later (Ka, Ks, n)

        const hasJsonNormals = Array.isArray(set.normals) && set.normals.length === V.length;
        const startIndex = indices.length; // remember where this set’s indices will begin

        //Walk each triangle inside the set
        for (let t = 0; t < T.length; t++) {
            const i0 = T[t][0], i1 = T[t][1], i2 = T[t][2]; // the three corner vertex IDs
            const p0 = V[i0],   p1 = V[i1],   p2 = V[i2];   // grab their positions

            positions.push(p0[0], p0[1], p0[2], 
                            p1[0], p1[1], p1[2],
                            p2[0], p2[1], p2[2]);

            let n0, n1, n2;
            if (hasJsonNormals) {
                n0 = set.normals[i0]; n1 = set.normals[i1]; n2 = set.normals[i2];
            } else {
                //compute a face normal and use it for all 3 corners -- fallback - I didnt know we were given the normals...
                const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
                const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
                let nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
                const len = Math.hypot(nx,ny,nz) || 1.0; nx/=len; ny/=len; nz/=len;
                n0 = n1 = n2 = [nx,ny,nz];
            }

            normals.push(
                n0[0],n0[1],n0[2],
                n1[0],n1[1],n1[2],
                n2[0],n2[1],n2[2]
            );

            kdArray.push(kd[0], kd[1], kd[2],
                        kd[0], kd[1], kd[2],
                        kd[0], kd[1], kd[2]);

            //indices for this brand-new triangle just count forward from `cursor`
            indices.push(cursor, cursor+1, cursor+2);
            cursor += 3; // we just added 3 new vertices
        }

        //record how many indices belong to this set 
        const indexCount = indices.length - startIndex;  // how many indices we just added
        drawSets.push({ startIndex, indexCount, material: mat, center: [cx, cy, cz] });
    }
    //Hand everything back to the caller
    return { positions, normals, kdArray, indices, drawSets };
}


// Draw every triangle set, using its own material from the JSON.
function drawTriangleSetsWithMaterials() {
    for (let i = 0; i < drawSets.length; i++) {
        const set = drawSets[i];

        // Ka = ambient 
        const ka = set.material.ambient || [0, 0, 0];
        gl.uniform3fv(uKa, new Float32Array(ka));

        // Ks = specular
        const ks = set.material.specular || [0, 0, 0];
        gl.uniform3fv(uKs, new Float32Array(ks));

        // n = shininess
        const n = (set.material.n != null) ? set.material.n : 32.0;
        gl.uniform1f(uShininess, n);


        //Part 5: per-set model = modelMatrices[i] * highlightScale
        //for each shape, we: 
        // (1) figure out how big it is (highlight scale), 
        // (2) where it sits (model matrix), 
        // (3) where the camera is looking (view), then 
        // (4) we multiply them to get the final where on screen for that shape, and draw it.
        const c = set.center;
        const M = mat4.create();

        // 1) translate LAST (after rotate & scale)
        mat4.translate(M, M, modelTranslations[i]);

        // 2) move pivot to center, apply rotation
        mat4.translate(M, M, c);
        mat4.multiply(M, M, modelRotations[i]);

        // 3) apply highlight scale about the center
        const s = highlightScales[i];
        if (s !== 1.0) mat4.scale(M, M, [s, s, s]);

        // 4) move pivot back
        mat4.translate(M, M, [-c[0], -c[1], -c[2]]);

        // Compose MV and normal matrix
        const MV = mat4.multiply(mat4.create(), gViewMatrix, M);
        gl.uniformMatrix4fv(modelViewMatrixUniform, false, MV);

        const N = mat3.create();
        mat3.normalFromMat4(N, MV);
        gl.uniformMatrix3fv(normalMatrixUniform, false, N);

        const byteOffset = set.startIndex * 2;

        //indexCount = how many indices belong to this set
        gl.drawElements(gl.TRIANGLES, set.indexCount, gl.UNSIGNED_SHORT, byteOffset);
    }
}


//Build the camera's local axes from dir and up
function getViewAxes(cam){
  const w = vec3.normalize(vec3.create(), cam.dir);                   // forward
  const u = vec3.normalize(vec3.create(), vec3.cross(vec3.create(),
                                                     cam.up, w));     // right = up × forward
  const v = vec3.normalize(vec3.create(), vec3.cross(vec3.create(),
                                                     w, u));          // up   = forward × right
  return { u, v, w };
}


//Make dir and up perfectly perpendicular and unit length 
function reOrthonormalize(cam){
  const w = vec3.normalize(vec3.create(), cam.dir);

  // make 'up' orthogonal to w, then rebuild a clean right-handed frame
  let v = vec3.subtract(vec3.create(), cam.up,
                        vec3.scale(vec3.create(), w, vec3.dot(cam.up, w)));
  vec3.normalize(v, v);

  const u = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), v, w)); // right = up × forward
  v.copy ? v.copy(v) : null; // no-op; keep v reference stable if your vec3 impl needs it

  // recompute v from the new u,w to lock orthogonality (and correct sign)
  vec3.normalize(v, vec3.cross(vec3.create(), w, u)); // up = forward × right

  vec3.copy(cam.dir, w);
  vec3.copy(cam.up,  v);
}


//slides the camera
function moveAlong(axis, amount){
    //eye = eye + amount * axis
    console.log("axis" + axis);
    vec3.scaleAndAdd(camera.eye, camera.eye, axis, amount);
}

//rotate
function rotateVectorAroundAxis(outVec, inVec, axis, angle){
    const m = mat4.create();
    mat4.fromRotation(m, angle, axis); // 4×4 rotation matrix
    vec3.transformMat4(outVec, inVec, m); // rotate the vector
}

//spins you left/right like turning your head
function yawCamera(angle){
    const {u, v, w} = getViewAxes(camera);
    const newDir = vec3.create();
    rotateVectorAroundAxis(newDir, w, v, angle); // rotate forward around up
    vec3.copy(camera.dir, vec3.normalize(newDir, newDir));
    
    reOrthonormalize(camera);
}

function pitchCamera(angle){
    const {u, v, w} = getViewAxes(camera);
    const newDir = vec3.create();
    const newUp  = vec3.create();
    
    rotateVectorAroundAxis(newDir, w, u, angle); // rotate forward
    rotateVectorAroundAxis(newUp,  v, u, angle); // rotate up 
    
    
    vec3.copy(camera.dir, vec3.normalize(newDir, newDir));
    vec3.copy(camera.up,  vec3.normalize(newUp,  newUp));
    
    reOrthonormalize(camera);
}



function initEllipsoidMesh(latitudeSegments, longitudeSegments){

	const positions = [];
	const normals = [];
	const colors = []; 
	const indices = [];


    //latitude rings (top to bottom)
    //longitude slices (around and around)

	// Create vertices
	for (let latitudeIndex = 0; latitudeIndex <= latitudeSegments; latitudeIndex++){
		const v01 = latitudeIndex / latitudeSegments;
		
        const phi = v01 * Math.PI;
		const cosPhi = Math.cos(phi);
		const sinPhi = Math.sin(phi);

		for (let longitudeIndex = 0; longitudeIndex <= longitudeSegments; longitudeIndex++){
			const u01 = longitudeIndex / longitudeSegments;
			
            const theta = u01 * Math.PI * 2.0;
			const cosTheta = Math.cos(theta);
			const sinTheta  = Math.sin(theta);

			//Unit-sphere position - https://mathinsight.org/spherical_coordinates
            //x = sin(φ) * cos(θ)
            //y = sin(φ) * sin(θ)
            //z = cos(φ)

			const x = sinPhi * cosTheta;
            const y = sinPhi * sinTheta;
            const z = cosPhi;

			positions.push(x, y, z);
			normals.push(x, y, z);	
			colors.push(1, 1, 1);	
		}
	}

	//Create indices (two triangles for each grid quad)
	const columnsPerRow = longitudeSegments + 1;
	for (let latitudeIndex = 0; latitudeIndex < latitudeSegments; latitudeIndex++){
		for (let longitudeIndex = 0; longitudeIndex < longitudeSegments; longitudeIndex++){
			const i0 = latitudeIndex * columnsPerRow + longitudeIndex; // (row, col)
			const i1 = i0 + 1; // (row, col+1)
			const i2 = (latitudeIndex + 1) * columnsPerRow + longitudeIndex;// (row+1, col)
			const i3 = i2 + 1; // (row+1, col+1)
			indices.push(i0, i2, i1);	
			indices.push(i1, i2, i3);
		}
	}

	//Upload to GPU 
	ellipsoidMesh.positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidMesh.positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	ellipsoidMesh.normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidMesh.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	ellipsoidMesh.colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidMesh.colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW); 

	ellipsoidMesh.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ellipsoidMesh.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	ellipsoidMesh.indexCount  = indices.length;
	ellipsoidMesh.vertexCount = positions.length / 3;
}


function drawOneEllipsoid(centerVec3, radiiVec3, material){
	const modelMatrix = mat4.create();
	mat4.translate(modelMatrix, modelMatrix, centerVec3); // move to center
	mat4.scale(modelMatrix, modelMatrix, radiiVec3); // stretch sphere -> ellipsoid

	const modelViewMatrix = mat4.multiply(mat4.create(), gViewMatrix, modelMatrix);
	gl.uniformMatrix4fv(modelViewMatrixUniform, false, modelViewMatrix);

	const normalMatrix = mat3.create();
	mat3.normalFromMat4(normalMatrix, modelViewMatrix);
	gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);

	const ambient  = material.ambient;
	const diffuse  = material.diffuse ;
	const specular = material.specular;
	const shininess = material.n;

	gl.uniform3fv(uKa, new Float32Array(ambient));
	gl.uniform3fv(uKs, new Float32Array(specular));
	gl.uniform1f(uShininess, shininess);

	const vertexCount = ellipsoidMesh.vertexCount;
	const kdArray = new Float32Array(vertexCount * 3);
	for (let i = 0; i < vertexCount; i++){
		kdArray[i * 3] = diffuse[0];
		kdArray[i * 3 + 1] = diffuse[1];
		kdArray[i * 3 + 2] = diffuse[2];
	}
	
    gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidMesh.colorBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, kdArray);
	gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidMesh.positionBuffer);
	gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidMesh.normalBuffer);
	gl.vertexAttribPointer(vertexNormalAttrib, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ellipsoidMesh.indexBuffer);
	gl.drawElements(gl.TRIANGLES, ellipsoidMesh.indexCount, gl.UNSIGNED_SHORT, 0);
}

//drawss a bunch of ellipsoids if needed
function drawEllipsoidBatch(list){
	for (let i = 0; i < list.length; i++){
		const item = list[i];
		drawOneEllipsoid(item.center, item.radii, item.material);
	}
}


//initialize drawing the blachole rings
//used this https://stackoverflow.com/questions/74673371/webgl-how-to-draw-a-ring
function initRingMesh(segments){
	segments = Math.max(16, segments | 0);

	const innerRadius = 1.0;
	const outerRadius = 1.0 + Math.max(0.0005, RING_THICKNESS); // ultra-thin
	const positions = [];
	const normals = [];
	const colors = [];
	const indices = [];

	for (let i = 0; i <= segments; i++){
		const t = i / segments;
		const a = t * Math.PI * 2.0;
		const c = Math.cos(a), s = Math.sin(a);

		//outer, then inner (two verts per)
		positions.push(outerRadius * c, outerRadius * s, 0.0);
		positions.push(innerRadius * c, innerRadius * s, 0.0);

		normals.push(0,0,1,  0,0,1);

		colors.push(1,1,1,1,1,1);
	}

	// two triangles per slice
	for (let i = 0; i < segments; i++){
		const iOuter = 2 * i;
		const iInner = 2 * i+1;
		const jOuter = 2 * (i+1);
		const jInner = 2 * (i+1)+1;

		indices.push(iOuter, iInner, jOuter);
		indices.push(jOuter, iInner, jInner);
	}

	ringMesh.positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ringMesh.positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	ringMesh.normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ringMesh.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	ringMesh.colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ringMesh.colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);

	ringMesh.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ringMesh.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	ringMesh.indexCount  = indices.length;
	ringMesh.vertexCount = positions.length / 3;
}




// read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = [];
    var file1 = getJSONFile(INPUT_TRIANGLES_URL, "triangles");
    var file2 = getJSONFile(INPUT_TRIANGLES_URL_2, "triangles");
    // var file1 = getJSONFile("triangles.json", "triangles");
    //var file2 = getJSONFile("triangles2.json", "triangles");
    // if (file1) 
    //     inputTriangles = inputTriangles.concat(file1);
    if (file2) 
        inputTriangles = inputTriangles.concat(file2);
    if (!inputTriangles.length) 
        return;

    const mesh = buildExpandedMesh(inputTriangles);
    
    // send the vertex coords to webGL
    vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.positions),gl.STATIC_DRAW); // coords to that buffer

    // Implemented by tjprice5 
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.kdArray), gl.STATIC_DRAW);
    
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);

    // Implemented by tjprice5
    triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

    triBufferSize = mesh.indices.length;
    drawSets = mesh.drawSets; 


    //Part 5 init: identity model matrices and no highlight
    highlightScales = drawSets.map(() => 1.0);
    modelRotations = drawSets.map(() => mat4.create()); // identity rotation
    modelTranslations = drawSets.map(() => vec3.create()); // [0,0,0]
    selectedSet = -1;


} // end load triangles

// setup the webGL shaders
// Changed shader code by tjprice5
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
   var fShaderCode = `
        precision mediump float;
        varying vec3 vPosEye;
        varying vec3 vNormEye;
        varying vec3 vKd;

        uniform vec3 uLightPosEye;
        uniform vec3 uKa;
        uniform vec3 uKs;
        uniform float uShininess;
        uniform bool uUnlit;

        void main(void) {
            // Unlit path (used for starfield)
            if (uUnlit) {
                gl_FragColor = vec4(vKd, 1.0);
                return;
            }

            vec3 N = normalize(vNormEye);
            vec3 L = normalize(uLightPosEye - vPosEye);
            vec3 V = normalize(-vPosEye);
            vec3 H = normalize(L + V);

            float NdotL = max(dot(N, L), 0.0);
            float NdotH = max(dot(N, H), 0.0);

            vec3 ambient  = uKa;
            vec3 diffuse  = vKd * NdotL;
            vec3 specular = uKs * pow(NdotH, uShininess) * step(0.0, NdotL);

            gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
        }
    `;

    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec3 vertexNormal;
        attribute vec3 vertexColor;

        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat3 normalMatrix;
        uniform float uPointSize;  

        varying vec3 vPosEye;
        varying vec3 vNormEye;
        varying vec3 vKd;

        void main(void) {
            vec4 posEye = modelViewMatrix * vec4(vertexPosition, 1.0);
            vPosEye  = posEye.xyz;
            vNormEye = normalize(normalMatrix * vertexNormal);
            vKd = vertexColor;

            gl_Position = projectionMatrix * posEye;
            gl_PointSize = uPointSize;   
        }
    `;

    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
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
            } 
            
            else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                uUnlit     = gl.getUniformLocation(shaderProgram, "uUnlit");
                uPointSize = gl.getUniformLocation(shaderProgram, "uPointSize");

                // Implemented by tjprice5 
                modelViewMatrixUniform = gl.getUniformLocation(shaderProgram, "modelViewMatrix");
                projectionMatrixUniform = gl.getUniformLocation(shaderProgram, "projectionMatrix");
                
                vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
                gl.enableVertexAttribArray(vertexColorAttrib);
                
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array


                vertexNormalAttrib = gl.getAttribLocation(shaderProgram, "vertexNormal");
                gl.enableVertexAttribArray(vertexNormalAttrib);


                // uniforms for lighting
                normalMatrixUniform = gl.getUniformLocation(shaderProgram, "normalMatrix");
                uLightPosEye = gl.getUniformLocation(shaderProgram, "uLightPosEye");
                uKa = gl.getUniformLocation(shaderProgram, "uKa");
                uKs = gl.getUniformLocation(shaderProgram, "uKs");
                uShininess = gl.getUniformLocation(shaderProgram, "uShininess");
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

var bgColor = 0;


//Turn camera.eye + camera.dir + camera.up into the matrices the GPU needs
//for part 5, we need to add per-set model view
//camera (view) + lens (projection) are shared for everyone
//each triangle set also has its own model
function applyCameraMatrices(){
    //1. Build view & projection
    const target = vec3.add(vec3.create(), camera.eye, camera.dir);
    mat4.lookAt(gViewMatrix, camera.eye, target, camera.up);

    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, Math.PI/2, 1.0, 0.1, 10.0);

    //2. Send projection now to gpu
    gl.uniformMatrix4fv(projectionMatrixUniform, false, projectionMatrix);

    //3. Light: world -> eye (use VIEW matrix)
    const lightWorld = vec4.fromValues(-0.5, 1.5, -0.5, 1.0);
    const lightEye   = vec4.create();
    vec4.transformMat4(lightEye, lightWorld, gViewMatrix);
    gl.uniform3f(uLightPosEye, lightEye[0], lightEye[1], lightEye[2]);
}




// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    requestAnimationFrame(renderTriangles);

    if (BH_ON) {
		renderBlackHole();
		return;
	}
    applyCameraMatrices();    

    if (renderMode === 'ellipsoids'){
        drawEllipsoidBatch(ellipsoidDrawList);
        return;
    }
   // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    // Bind color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(vertexNormalAttrib, 3, gl.FLOAT, false, 0, 0);   

    // DRAW CALL
    drawTriangleSetsWithMaterials();
    
} // end render triangles


//one blackhole ring
function drawOneRing(centerVec3, radius, axisVec3, tiltRadians, kd, ka, overlay){
	initRingMesh(RING_SEGMENTS);

	// MODEL: translate -> rotate -> scale
	const M = mat4.create();
	mat4.translate(M, M, centerVec3);
	if (axisVec3 && tiltRadians){
		const axis = vec3.normalize(vec3.create(), axisVec3);
		mat4.rotate(M, M, tiltRadians, axis);
	}
	mat4.scale(M, M, [radius, radius, radius]);

	// MV + normal
	const MV = mat4.multiply(mat4.create(), gViewMatrix, M);
	gl.uniformMatrix4fv(modelViewMatrixUniform, false, MV);
	const N = mat3.create();
	mat3.normalFromMat4(N, MV);
	gl.uniformMatrix3fv(normalMatrixUniform, false, N);

	// material
	const Ka = ka;
	const Kd = kd;
	gl.uniform3fv(uKa, new Float32Array(Ka));
	gl.uniform3fv(uKs, new Float32Array([0,0,0]));
	gl.uniform1f(uShininess, 1.0);

	// per-vertex diffuse color
	const vc = ringMesh.vertexCount;
	const kdArray = new Float32Array(vc * 3);
	for (let i=0;i<vc;i++){
		kdArray[i*3+0] = Kd[0];
		kdArray[i*3+1] = Kd[1];
		kdArray[i*3+2] = Kd[2];
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, ringMesh.colorBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, kdArray);
	gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, ringMesh.positionBuffer);
	gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, ringMesh.normalBuffer);
	gl.vertexAttribPointer(vertexNormalAttrib, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ringMesh.indexBuffer);

	// additive glow
	const hadCull = gl.isEnabled(gl.CULL_FACE);
	if (overlay){
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
	}
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	gl.depthMask(false);

	gl.drawElements(gl.TRIANGLES, ringMesh.indexCount, gl.UNSIGNED_SHORT, 0);

	// restore state
	gl.depthMask(true);
	gl.disable(gl.BLEND);
	if (overlay){
		gl.enable(gl.DEPTH_TEST);
		if (hadCull) 
            gl.enable(gl.CULL_FACE);
	}
}

//draw a bunch of blackhole rings
function drawRingStack(centerVec3, baseRadius, ringCount, ringSpacing, axisVec3, tiltRadians){
	//a tiny helper that blends two colors a and b
    //t = 0 means all a, t = 1 means all b, and values in between slide between them
    function mix(a,b,t){ 
        return [a[0] +(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
	
    //samples from a nasa image
    const deepRed = [0.90, 0.10, 0.02];
	const orange  = [1.0, 0.51765, 0.00784];
	const whitey  = [0.90, 0.10, 0.02];

    // Get now in seconds; use this to make the rings flicker a tiny bit
	const tNow = performance.now() * 0.001;

    // Make a bunch of rings, one after another
	for(let i = 0;i < ringCount; i++){
        // r is how far this ring is from the center
		const r = baseRadius + i * ringSpacing;

		//inner = redder, outer = hotter
        
        //t = where we are from inner to outer (0 at the first ring, ~1 at the last).
		const t = i / Math.max(1, (ringCount - 1));
		// mid = a blend from deep red to orange (inner rings more red, outer more orange)
        const mid = mix(deepRed, orange, Math.min(1.0, t*1.2));
        // hot = then blend that toward white to make the very outer rings look hotter
		const hot = mix(mid, whitey, Math.max(0.0, (t - 0.65) / 0.35));

		// subtle flicker - Used ChatGPT to create the flicker
        // We use a cosine wave that changes over time and slightly per ring
		const flick = 0.80 + 0.20 * Math.cos(tNow * 1.2 + i * 0.35);
		const kd = [hot[0] * flick, hot[1] * flick, hot[2] * flick];
		const ka = [kd[0] * 0.30, kd[1] * 0.30, kd[2] * 0.30];

		drawOneRing(centerVec3, r, axisVec3, tiltRadians, kd, ka);
	}
}

//similar structure to drawonering - axis is x tho
function drawHorizontalRings(centerVec3, baseRadius, ringCount, ringSpacing, overlay, tiltFromEdgeDeg){
	function mix(a,b,t){ 
        return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; 
    }
	const deepRed = [0.90, 0.10, 0.02];
	const orange  = [1.0, 0.51765, 0.00784];
	const whitey  = [0.90, 0.10, 0.02];
	
    const tNow = performance.now() * 0.001;

	
	const axis = [1,0,0];
	const eps  = (tiltFromEdgeDeg==null ? 5.0 : tiltFromEdgeDeg) * Math.PI / 180.0;
	const tilt = Math.PI * 0.5 - eps;   // slightly face the camera

	for (let i = 0;i < ringCount; i++){
		const r = baseRadius + i * ringSpacing;

		const t = i / Math.max(1,(ringCount-1));
		const mid = mix(deepRed, orange, Math.min(1.0, t*1.2));
		const hot = mix(mid, whitey, Math.max(0.0, (t-0.65)/0.35));
		const flick = 0.82 + 0.18 * Math.sin(tNow*1.6 + i*0.33);

		const kd = [hot[0]*flick, hot[1]*flick, hot[2]*flick];
		const ka = [kd[0]*0.30, kd[1]*0.30, kd[2]*0.30];

		drawOneRing(centerVec3, r, axis, tilt, kd, ka, overlay);
	}
}

function initStars(count){
    const pos = [], col = [], nrm = [];
    
    // Make a random direction on a sphere (a unit vector).
    function randDir(){
        //random unit vector
        let x,y,z,l;
        do {
            //pick a random point in the cube [-1,1]^3 
            x = Math.random() * 2 - 1; 
            y = Math.random() *2 - 1; 
            z = Math.random() * 2 - 1;
            //length of the vector
            l = Math.hypot(x,y,z); 
        } while (l < 0.01); //if too tiny, try again
        return [x/l, y/l, z/l];
    }


    for (let i = 0;i < count; i++){
        const d = randDir();
        pos.push(d[0], d[1], d[2]); // on unit sphere
        
        // normals all zeros so the shader takes the unlit brnach for stars
        nrm.push(0,0,0); 

        const hot = Math.pow(Math.random(), 8);
        const base = 0.6 + 0.4 * hot;
        const bluish = 0.9 + 0.1 * Math.random();
        col.push(base, base, bluish);
    }

    starPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

    starColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(col), gl.STATIC_DRAW);

    starNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nrm), gl.STATIC_DRAW);

    starCount = count;
}

function drawStars(radius, pointSize){
    if (!starPositionBuffer) 
        initStars(800);  

    const M = mat4.create();
    mat4.translate(M, M, camera.eye);
    mat4.scale(M, M, [radius, radius, radius]);

    const MV = mat4.multiply(mat4.create(), gViewMatrix, M);
    gl.uniformMatrix4fv(modelViewMatrixUniform, false, MV);

    const N = mat3.create();
    mat3.normalFromMat4(N, MV);
    gl.uniformMatrix3fv(normalMatrixUniform, false, N);

    //don't write depth so scene can paint over stars
    gl.uniform1i(uUnlit, 1);
    gl.uniform1f(uPointSize, pointSize || 2.0);
    gl.uniform3fv(uKs, new Float32Array([0,0,0]));
    gl.uniform1f(uShininess, 1.0);

    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.bindBuffer(gl.ARRAY_BUFFER, starPositionBuffer);
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starNormalBuffer);
    gl.vertexAttribPointer(vertexNormalAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starColorBuffer);
    gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, starCount);

    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1i(uUnlit, 0);          
    gl.uniform1f(uPointSize, 1.0);   
}


function renderBlackHole(){
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	applyCameraMatrices();
    
    // radius and point size in pixels
    drawStars(6.0, 2.0); 

	//core sphere - black
	drawOneEllipsoid(BH_CENTER, [BH_RADIUS, BH_RADIUS, BH_RADIUS], BH_MAT);

	const tilt = 0.20; // slight disk tilt
	const base = BH_RADIUS * 1.10; // start just outside shadow
	const count	= 46; 
	const gap = BH_RADIUS * 0.015; // bigger gap = clearly separate lines
	
    drawRingStack(BH_CENTER, base, count, gap, [1,0,0], tilt);

	// bright photon ring hugging the hole (also ultra-thin)
	drawOneRing(
		BH_CENTER,
		BH_RADIUS * 1.22,
		[1,0,0],
		tilt,
		[1.00, 0.95, 0.85],
		[0.60, 0.50, 0.45]
	);

    //horizontal “across the hole” band in the XZ plane
	const baseH	= BH_RADIUS * 1.65;			
	const countH= 28;
	const gapH	= BH_RADIUS * 0.03;
	drawHorizontalRings(BH_CENTER, baseH, countH, gapH, true); 
}




/* MAIN -- HERE is where execution begins after window load */

function main() {
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders\
  
  initStars(1000);

  //number of segments to have more = smoother
  initEllipsoidMesh(25, 25);
  
  window.addEventListener('keydown', onKeyDown);
  renderTriangles(); // draw the triangles using webGL
} // end main
