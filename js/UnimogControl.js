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
 * @property camera {Object} Variable for the camera 
 */
var camera;

/**
 * @property io {Object} Variable for socket.io connection, port is set automatically
 */
var io = io();

/**
 *  @property effect {Object} variable for Pepper ghost effect, works as new renderer object
 */
var effect;

/**
 * @property continueToPepper {Boolean} Variable which is set to true once the welcome window is closed. 
 */
var continueToPepper = false;
var zRotationChange = 0.01;
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
 * @property globalUnimog {Object} Variable for global unimog objects which will be added to the scene.
 * @type {Object}
 */
var globalUnimog;

/**
 * @property unimogCube {Object} Variable for the Unimog cube which will be added to the scene.
 * @type {Object}
 */
var unimogCube;

/**
 * @property unimogLogo {Object} Variable for the Unimog musuem logo which will be added to the scene.
 * @type {Object}
 */
var unimogLogo;

/**
 * @listens Once the DOMcontent is loaded, action will begin
 */
var listener = window.addEventListener('DOMContentLoaded',function(){

    /**
     * @event Listens from the leap for the translate model event
     */
    var translateEvent = io.on('translateModel', translateModel);

    /**
     * @event Listens from the leap for the change model event
     */
    var changeEvent = io.on('changeModel',changeModel);

    /**
     * @event Listens from the leap for the scale model event
     */
    var scaleEvent = io.on('scaleModel',scaleModel);

    /**
     * @event Listens from the leap for the rotate model event
     */
    var rotateEvent = io.on('rotateModel', rotateModel);

    /**
     * @event resetEvent Listens from the leap for the reset model event
     */
    var resetEvent = io.on('resetModel', resetModel);

    /**
     * @event uncoverEvent Listens from the leap for the uncover model event
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

    var container, stats;

    var scene, renderer;

    /**
     * @property uncovered {Boolean} Boolean value for the uncovering of the Unimog from the cube
     */
    var uncovered = false;

    /**
     * @property loader {Object} This JS object is used for loading the JSON models 
     */
    var loader = new THREE.AssimpJSONLoader();

    init();
    addPeppersGhost();
    animate();

    /**
     * @function This function initializes the camera, light, models and stats before it is rendered
     */
    function init() {

        container = document.getElementById('render-box');
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 200);
     	window.camera = camera;
        scene = new THREE.Scene();
        window.scene = scene;


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
        window.renderer = renderer;
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
     * @function This function addes the pepper ghost effect to the scene, which
     * divides the scene into four equal parts.
     */
    function addPeppersGhost() {
            effect = new THREE.PeppersGhostEffect(renderer );
            effect.setSize(window.innerWidth, window.innerHeight);
            effect.cameraDistance = 50;
      }

    /**
     * @listens Once the window is resized, the scene size dimensions are set accordingly.
     */
    function onWindowResize() {

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        effect.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

    }

     * @listens This function deals with what should be done when the scene is updated.
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
     * @function This function renders the scene according to the camera settings
     */
    function render() {
          effect.render(scene, camera);
    }

    /**
     * @function This function translates the model along the y-axis
     * @todo This function could be extended to be translated along the other two axes
     * @param coord Coordinate of the model 
     */
    function translateModel(coord){
        if(uncovered){
          globalUnimog.position.y += coord.y / 1000;
        }
    }

    /**
     * @param direction determins in which direction the model is rotated
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
     *  @function This function changes the models.
     *  @param {JSON} modelInformation The information of the model: type (logo,cube or unimog) 
     *  and model (the file name with the extension .JSON)
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
     * @function This function scales the unimog object as desired according to scale value.
     * @param {number} scaleValue Value with which the unimog is scaled
     */
    function scaleModel(scaleValue){
        scaleValue /= 100;
        globalUnimog.scale.set(scaleValue,scaleValue,scaleValue);
    }

    /** 
     * @function With this function models are loaded into the scene. 
     * Up to now we have a certain row of how the models are loaded.
     * First the logo is loaded, secondly the cube and finally the unimog models
     * @param {JSON} modelInformation The information of the model: type (logo,cube or unimog) and model (the file name with the extension .JSON) 
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
     * @function This function scales a given model using the desired volume  
     * @param {number} desiredVolume 
     * @param {*} object 
     */
    function uniformScale(desiredVolume, object){
        var size = new THREE.Box3().setFromObject(object).getSize();
        var desiredFactor = Math.cbrt(desiredVolume / (size.x * size.y * size.z));
        console.log(`desired factor for scaling: ${desiredFactor}`);
        return desiredFactor;
    }
    /**
     * @function This function resets the Unimog object model back into its original position
     * and original rotated position
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
     * @function This function calculates the rotation degree for the unimog object.
     * @param {number} x 
     * @param {number} y 
     * @param {number} radius 
     */
    function calculateRotationDegree(x,y,radius){
        var radian = Math.atan2((y/radius),(x/radius));
        var degree = (((radian * 180 / Math.PI) + 360) % 360);
        // console.log(`x: ${x}, y: ${y} radius: ${radius}, degree ${degree}`);
        return degree;
    }

    /**
     * @function This is function which used the explode model function 
     * and pulls apart the Unimog cube. The cube will disappear if it is pulled too far apart.
     * @param {number} percentage
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
     * @function This function explodes a given ThreeJS object with a given multiplier value.
     * Each child of the object is translated along the same axis.
     * @param {*} model 
     * @param {number} multiplier 
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
     * @function This function sets the camera to x,y,z = 0.1,
     * runs the pepper ghost effect and finally renders the scene.
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
     */
    window.scene = scene;

    /**
     * Used for debugging in browser console
     */
    window.rotateModel = rotateModel;

    /**
     * Used for debugging in browser console
     */
    window.changeModel = changeModel;

    /**
     * Used for debugging in browser console
     */
    window.explode = explodeModel;

});