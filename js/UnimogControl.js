/*MIT License

Copyright (c) 2019 Gabriel Dimitrov, Julian Leuze

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/


/**
TODO change camera position
*/
var io = io();
var zGlobal = 0;
var effect;
var continueToPepper = false;
var zRotationChange = 0.01;
var maxExplodeValue = 1.3;

//Desired volumes for scene objects
var unimogDesiredVolume = 3000 * 2;
var logoDesiredVolume = 2000 *2;
var cubeDesiredVolume = 9261 * 2;

//Variables for scene objects
var globalUnimog;
var unimogCube;
var unimogLogo;

window.addEventListener('DOMContentLoaded',function(){

    io.on('translateModel', translateModel);

    io.on('changeModel',changeModel);

    io.on('scaleModel',scaleModel);

    io.on('rotateModel', rotateModel);

    io.on('resetModel', resetModel);

    io.on('uncoverModel', pullApartCube)

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

    var container, stats, clock;
    var camera, scene, renderer;
    var uncovered = false;
    var loader = new THREE.AssimpJSONLoader();

    init();

    addPeppersGhost();
    animate();

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

    function addPeppersGhost() {
            effect = new THREE.PeppersGhostEffect(renderer );
            effect.setSize(window.innerWidth, window.innerHeight);
            effect.cameraDistance = 50;
      }

    function onWindowResize() {

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        effect.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

    }

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

    function render() {
          effect.render(scene, camera);
    }

    function translateModel(coord,container){
        if(uncovered){
          globalUnimog.position.y += coord.y / 1000;
        }
    }


    function rotateModel(direction){
        if(uncovered){
            if(direction){
                globalUnimog.rotation.z += zRotationChange;
            }else{
                globalUnimog.rotation.z -= zRotationChange;
            }
        }
    }

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


    function scaleModel(scaleValue){
        scaleValue /= 100;
        globalUnimog.scale.set(scaleValue,scaleValue,scaleValue);
    }


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

    function uniformScale(desiredVolume, object){
        var size = new THREE.Box3().setFromObject(object).getSize();
        var desiredFactor = Math.cbrt(desiredVolume / (size.x * size.y * size.z));
        console.log(`desired factor for scaling: ${desiredFactor}`);
        return desiredFactor;
    }

    function resetModel(){
        globalUnimog.position.x = 0;
        globalUnimog.position.y = 0;
        globalUnimog.position.z = 0;
        globalUnimog.rotation.x = - Math.PI / 4;
        globalUnimog.rotation.y = 0;
        globalUnimog.rotation.z = 0;
        var desiredFactor = uniformScale(unimogDesiredVolume,globalUnimog);
        globalUnimog.scale.multiplyScalar(desiredFactor);
        console.log("unimog's position reseted");
    }

    function calculateRotationDegree(x,y,radius){
        var radian = Math.atan2((y/radius),(x/radius));
        var degree = (((radian * 180 / Math.PI) + 360) % 360);
        // console.log(`x: ${x}, y: ${y} radius: ${radius}, degree ${degree}`);
        return degree;
    }


    function pullApartCube(percentage){
        explodeModel(unimogCube,percentage);
        if(percentage >= 0.5 && percentage < 0.95){
            uncovered = true;
        }else if(percentage >= 0.95){
          console.log('imma else')
            scene.remove(unimogCube);
        }
    }

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
        })



        // model.traverse ( function (child) {
        //   var v = new THREE.Vector3();
        //   v.copy(child.position);
        //   child.localToWorld(v);
        //   model.worldToLocal(v);
        //   coords = ['x', 'y', 'z']
        //   for(let i = 0; i < coords.length; i++) {
        //     if(v[coords[i]] >= 0) {
        //         child.position[coords[i]] = val
        //     } else {
        //         child.position[coords[i]] = -val
        //     }
        //   }
        //
        // });
    }

    function setCameraMode(){
        camera.position.x = 0.1;
        camera.position.y = 0.1;
        camera.position.z = 0.1;
        effect.ecm();
        effect.render(scene,camera);
    }



    window.scene = scene;
    window.rotateModel = rotateModel;
    window.changeModel = changeModel;
    window.explode = explodeModel;

});
