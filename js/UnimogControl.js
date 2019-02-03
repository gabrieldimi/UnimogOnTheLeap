    /**
    * @module js/UnimogControl
    * @license
    * MIT License
    * Copyright (c) 2019 Gabriel Dimitrov, Julian Leuze
    *
    * Permission is hereby granted, free of charge, to any person obtaining a copy
    * of this software and associated documentation files (the "Software"), to deal
    * in the Software without restriction, including without limitation the rights
    * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    * copies of the Software, and to permit persons to whom the Software is
    * furnished to do so, subject to the following conditions:
    *
    * The above copyright notice and this permission notice shall be included in all
    * copies or substantial portions of the Software.
    *
    * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    * SOFTWARE.
    */




/**
 * @todo Camera needs to set as needed
 * @property {Object} camera Variable for the camera
 */
var camera;

/**
 * @property {Object} io Variable for socket.io connection, port is set automatically
 */
var io = io();

/**
 *  @property {Object} effect Variable for Pepper ghost effect, works as new renderer object
 */
var effect;

/**
 *  @property {Object} scene Variable for scene
 */
var scene;

/**
 *  @property {Object} renderer Variable for scene renderer
 */
var renderer;

/**
 *  @property {Object} container Variable for getting the HTML container, in which the canvas is rendered
 */
var container;

/**
 * @property {Boolean} stats Variable for statistic
 */
var stats;

/**
 * @property {Boolean} uncoverd Boolean value for the uncovering of the Unimog from the cube
 */
var uncovered = false;

/**
 * @property {Object} loader This JS object is used for loading the JSON models
 */
var loader = new THREE.AssimpJSONLoader();

/**
 * @property {boolean} continueToPepper Variable which is set to true once the welcome window is closed.
 */
var continueToPepper = false;

/**
 * @property {number} zRotationChange Variable which is used for the rotation of a model along the z-axis.
 */
var zRotationChange = 0.01;

/**
 * @property {number} maxExplodeValue Variable which states the maxinum explode value
 */
var maxExplodeValue = 1.3;

/**
 *  @static Desired volume for global Unimog object
 */
var unimogDesiredVolume = 3000;

/**
 *  @static Desired volume for Unimog cube object
 */
var cubeDesiredVolume = 9261;

/**
 *  @static Desired volume for Gaggenau logo object
 */
var logoDesiredVolume = 2000;

/**
 * @property {Object} globalUnimog Variable used for saving the global unimog object which will be added to the scene.
 */
var globalUnimog;

/**
 * @property {Object} unimogCube Variable used for saving the Unimog cube which will be added to the scene.
 */
var unimogCube;

/**
 * @property {Object} unimogLogo Variable used for saving the Unimog musuem logo which will be added to the scene.
 */
var unimogLogo;

/**
 * Once the DOMcontent is loaded, action will begin
 */
window.addEventListener('DOMContentLoaded',function(){

    /**
     * Listens from the leap for a translate model event
     * @event translateModel
     * @see translateModel()
     */
    var translateEvent = io.on('translateModel', translateModel);

    /**
     * Listens from the leap for the change model event
     * @event changeModel
     * @see changeModel()
     */
    var changeEvent = io.on('changeModel',changeModel);

    /**
     * Listens from the leap for the scale model event
     * @event scaleModel
     * @see scaleModel()
     */
    var scaleEvent = io.on('scaleModel',scaleModel);

    /**
     * Listens from the leap for the rotate model event
     * @event rotateModel
     * @see rotateModel()
     */
    var rotateEvent = io.on('rotateModel', rotateModel);

    /**
     * Listens from the leap for the reset model event
     * @event resetModel
     * @see resetModel()
     */
    var resetEvent = io.on('resetModel', resetModel);

    /**
     * Listens from the leap for the uncover model event
     * @event uncoverModel
     * @see pullApartCube()
     */
    var uncoverEvent = io.on('uncoverModel', pullApartCube)

    displayPosition = document.getElementById('unimogPosition');
    displayUnimogModel = document.getElementById('unimogModel');
    uncover = document.getElementById('uncover');
    uncover.addEventListener('click', function(){
        pullApartCube(0.1);
    });

    ecm = document.getElementById('setCamera');
    ecm.addEventListener('click',setCameraMode);

    display = document.getElementById('displayPanel');

    if (WEBGL.isWebGLAvailable() === false) {

        document.body.appendChild(WEBGL.getWebGLErrorMessage());

    }

    init();
    addPeppersGhost();
    animate();

    /**
     * This function initializes the camera, light, models, controls and stats before it is rendered
     * @function init
     */
    function init() {

        container = document.getElementById('render-box');
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 200);
        scene = new THREE.Scene();

        // load unimog logo
        logoModelJson = {
            'type': 'logo',
            'model': 'logoGaggenau.json'
        }
        loadModel(logoModelJson);

        var ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        scene.add(ambientLight);

        var directionalLight = new THREE.DirectionalLight(0xeeeeee);
        directionalLight.position.set(1, 1, - 1);
        directionalLight.position.normalize();
        scene.add(directionalLight);

        renderer = new THREE.WebGLRenderer();

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        console.log(renderer)
        container.appendChild(renderer.domElement);
        controls = new THREE.OrbitControls(camera, renderer.domElement);

        controls.update();


        stats = new Stats();
        container.appendChild(stats.dom);

        window.addEventListener('resize', onWindowResize, false);

    }

    /**
     * This function addes the pepper ghost effect to the scene, which
     * divides the scene into four equal parts.
     * @function addPeppersGhost
     */
    function addPeppersGhost() {
            effect = new THREE.PeppersGhostEffect(renderer );
            effect.setSize(window.innerWidth, window.innerHeight);
            effect.cameraDistance = 50;
      }

    /**
     * Once the window is resized, the scene size dimensions are set accordingly.
     * @function onWindowResize
     * @listens Resize
     */
    function onWindowResize() {

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        effect.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

    }

    /**
     * This function deals with what should be done when the scene is updated.
     * @function animate
     */
    function animate() {

        requestAnimationFrame(animate);
        controls.update();

        render();
        stats.update();
        // if(globalUnimog) {
        //   display.textContent = `${globalUnimog.position.x.toFixed(3)}, ${globalUnimog.position.y.toFixed(3)}, ${globalUnimog.position.z.toFixed(3)}`
        // }

        if(globalUnimog) {
          displayPosition.textContent = `${globalUnimog.position.x.toFixed(3)}, ${globalUnimog.position.y.toFixed(3)}, ${globalUnimog.position.z.toFixed(3)}`
        }

    }

    /**
     * This function renders the scene according to the camera settings.
     * @function render
     */
    function render() {
          effect.render(scene, camera);
    }

    /**
     * This function translates the model along the y-axis
     * @function translateModel
     * @todo This function could be extended to be translated along the other two axes.
     * @param {JSON} coord X-Y-Z-coordinates of the loaded model
     */
    function translateModel(coord){
        if(uncovered){
          globalUnimog.position.y += coord.y / 1000;
        }
    }

    /**
     * This function rotates the loaded Unimog in either directions, clockwise and anti-clockwise.
     * @function rotateModel
     * @param {boolean} direction It determines in which direction the model is rotated, either true for clockwise and false for anti-clockwise.
     */
    function rotateModel(direction){
        if(uncovered){
            if(direction){
                globalUnimog.rotation.z += zRotationChange;
            }else{
                globalUnimog.rotation.z -= zRotationChange;
            }
        }
    }

    /**
     *  This function transits to the pepper ghost page from the welcome page and 
     *  then changes the models, beginning with the logo. Once the logo is changed, the cube with the Unimog inside appears.
     *  After that, once the cube is pulled apart and the Unimog is revealed, one can change the Unimog models only and one cannot 
     *  back to the cube model nor the logo model.
     *  @function changeModel 
     *  @param {JSON} modelInformation The information of the model: type (logo,cube or unimog)
     *  and model (the file name with the extension .JSON).
     *  @see loadModel()
     *  
     */
    function changeModel(modelInformation){

        if(!continueToPepper){
            fadeOut();
            continueToPepper = true;
        }else{

            if(scene.getObjectByName('logo')){
                scene.remove(window.unimogLogo);

                // load unimog cube
                var cubeModelJson ={
                    'type': 'cube',
                    'model': 'gaggenauCubeII.json'
                }
                loadModel(modelInformation);
                loadModel(cubeModelJson);


            }else if(uncovered){
                scene.remove(window.globalUnimog);
                loadModel(modelInformation);
            }
        }

    }

    /**
     * This function scales the unimog object as desired according to scale value.
     * @function scaleModel
     * @param {number} scaleValue Value with which the unimog is scaled.
     */
    function scaleModel(scaleValue){
        scaleValue /= 100;
        globalUnimog.scale.set(scaleValue,scaleValue,scaleValue);
    }

    /**
     * With this function models are loaded into the scene.
     * Up to now we have a certain row of how the models are loaded.
     * First the logo is loaded, secondly the cube and finally the unimog models.
     * @function loadModel
     * @param {JSON} modelInformation The information of the model: type (logo,cube or unimog) and model (the file name with the extension .JSON)
     * @see uniformScale()
     */
    function loadModel(modelInformation){
        loader.load(modelInformation.model, function (object) {
            object.name = modelInformation.type;
            var desiredFactor;
            switch(modelInformation.type){
                case 'logo':
                    unimogLogo = object;
                    object.rotation.z = Math.PI -0.2;
                    desiredFactor = uniformScale(logoDesiredVolume,object);
                    break;
                case 'cube':
                    unimogCube = object;
                    object.traverse(function (child){
                        if(child.material){
                            child.material.side = THREE.DoubleSide;
                        }
                    });
                    desiredFactor = uniformScale(cubeDesiredVolume,object);
                    //Adding originalPosition to every child as a new object
                    //so that there is no reference. Will later be used for explosion
                    object.traverse(child => {
                      child.userData.originalPosition = {
                        'x': child.position.x,
                        'y': child.position.y,
                        'z': child.position.z
                      };

                    });
                    break;
                case 'unimog':
                    globalUnimog = object;
                    //Unimog position adjustment, so model doesnt have to be changed
                    object.position.y -= 2
                    object.position.z -= 2
                    desiredFactor = uniformScale(unimogDesiredVolume,object);
                    break;
            }
            object.scale.multiplyScalar(desiredFactor);
            scene.add(object);
            displayUnimogModel.textContent = modelInformation.model;
        });
    }

    /**
     * This function scales a given model using the desired volume.
     * @function uniformScale
     * @param {number} desiredVolume The object receives the dimensions accordingly of the desired volume.
     * @param {Object} object Object which should be scaled.
     */
    function uniformScale(desiredVolume, object){
        var size = new THREE.Box3().setFromObject(object).getSize();
        var desiredFactor = Math.cbrt(desiredVolume / (size.x * size.y * size.z));
        console.log(`desired factor for scaling: ${desiredFactor}`);
        return desiredFactor;
    }
    /**
     * This function resets the Unimog object model back into its original position
     * and original rotated position.
     * @function resetModel
     */
    function resetModel(){
        globalUnimog.position.x = 0;
        globalUnimog.position.y = 0;
        globalUnimog.position.z = 0;
        globalUnimog.rotation.x = 0;
        globalUnimog.rotation.y = 0;
        globalUnimog.rotation.z = 0;
        var desiredFactor = uniformScale(unimogDesiredVolume,globalUnimog);
        globalUnimog.scale.multiplyScalar(desiredFactor);
        console.log("unimog's position reseted");
    }

    /**
     * This function calculates the rotation degree for the unimog object.
     * @function calculateRotationDegree
     * @param {number} x X-coordinate of the point on the circle
     * @param {number} y Y-coordinate of the point on the circle
     * @param {number} radius Radius of given circle
     */
    function calculateRotationDegree(x,y,radius){
        var radian = Math.atan2((y/radius),(x/radius));
        var degree = (((radian * 180 / Math.PI) + 360) % 360);
        // console.log(`x: ${x}, y: ${y} radius: ${radius}, degree ${degree}`);
        return degree;
    }

    /**
     * This is function which uses the explode model function
     * and pulls apart the for example Unimog cube. The cube will disappear if it is pulled too far apart.
     * @function pullApartCube
     * @param {number} percentage This value states how far the Unimog cube has been pulled apart.
     * @see explodeModel()
     * @todo Make applicable for every model and not just cubes. In other words, get rid of hard code.
     */
    function pullApartCube(percentage){
        explodeModel(unimogCube,percentage);
        if(percentage >= 0.5 && percentage < 0.95){
            uncovered = true;
        }else if(percentage >= 0.95){
          console.log('imma else')
            scene.remove(unimogCube);
        }
    }

    /**
     * This function explodes a given ThreeJS object with a given multiplier value.
     * Each child of the object is translated along the same axis.
     * @function explodeModel
     * @param {Object} model The 3D model which will be exploded.
     * @param {number} multiplier The value with which the 3D model will be exploded.
     */
    function explodeModel(model,multiplier) {
        var val = 1 + multiplier * maxExplodeValue;
        unimogCube.rotation.x = (Math.PI / 4) * multiplier
        unimogCube.rotation.y = (Math.PI / 4) * multiplier
        unimogCube.rotation.z = (Math.PI / 4) * multiplier
        unimogCube.traverse(child => {
          if(child.type !== 'Mesh') {
          // console.log(child.getWorldPosition())
          // var v = child.position;
          var v = child.userData.originalPosition;
          coords = ['x', 'y', 'z']
            for(let i = 0; i < coords.length; i++) {
              if(v[coords[i]] >= 0.001 || v[coords[i]] <= -0.001 && v[coords[i]] !== 0) {
                  // console.log(`changing ${child.name}, index: ${i}, from: ${child.position[coords[i]]}, to ${val * child.userData.originalPosition[coords[i]]}`)
                  child.position[coords[i]] = val * child.userData.originalPosition[coords[i]]
              }
            }
          }

        });
    }
    /**
     * This function sets the camera to x,y,z = 0.1,
     * runs the pepper ghost effect and finally renders the scene.
     * @function setCameraMode
     */
    function setCameraMode(){
        camera.position.x = 0.1;
        camera.position.y = 0.1;
        camera.position.z = 0.1;
        effect.ecm();
        effect.render(scene,camera);
    }

    /**
     * Used for debugging in browser console
     * @global
     */
    window.rotateModel = rotateModel;

    /**
     * Used for debugging in browser console
     * @global
     */
    window.changeModel = changeModel;

    /**
     * Used for debugging in browser console
     * @global
     */
    window.explode = explodeModel;

    /**
     * Used for debugging in browser console
     * @global
     */
    window.camera = camera;

    /**
     * Used for debugging in browser console
     * @global
     */
    window.scene = scene;

    /**
     * Used for debugging in browser console
     * @global
     */
    window.renderer = renderer;


});
