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
var zRotationChange = 0.01;
var maxExplodeValue = 10;

//Desired volumes for scene objects
var unimogDesiredVolume = 3000;
var logoDesiredVolume = 2000;
var cubeDesiredVolume = 3500;

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

    display = document.getElementById('displayPanel');

    if (WEBGL.isWebGLAvailable() === false) {

        document.body.appendChild(WEBGL.getWebGLErrorMessage());

    }

    var container, stats, clock;
    var camera, scene, renderer, effect;
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
        renderer.domElement.style.width = '99.7%';
        renderer.domElement.style.height = '100%';
        console.log(renderer)
        container.appendChild(renderer.domElement);
        camera.position.x = 0.1;
        camera.position.y = 0.1;
        camera.position.z = 0.1;

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
        renderer.domElement.style.width = '99.7%';
        renderer.domElement.style.height = '100%';
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
        if(scene.getObjectByName('logo')){
            scene.remove(window.unimogLogo);

            // load unimog cube 
            var cubeModelJson ={
                'type': 'cube',
                'model': 'gaggenauCube.json'
            }
            loadModel(modelInformation);
            loadModel(cubeModelJson);
            
        }else if(uncovered){
            scene.remove(window.globalUnimog);
            loadModel(modelInformation);
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

                    break;
                case 'unimog':
                    globalUnimog = object; 
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
        globalUnimog.rotation.x = 0;
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
        if(percentage >= 0.5){
            uncovered = true;
        }else if(percentage = 0.95){
            scene.remove('cube');
        }
    }

    function explodeModel(model,multiplier) {
        var val = multiplier * maxExplodeValue;
        model.traverse ( function (child) {
          var v = new THREE.Vector3();
          v.copy(child.position);
          child.localToWorld(v);
          model.worldToLocal(v);
          coords = ['x', 'y', 'z']
          for(let i = 0; i < coords.length; i++) {
            if(v[coords[i]] >= 0) {
                child.position[coords[i]] = val
            } else {
                child.position[coords[i]] = -val
            }
          }
    
        });
      }

    window.scene = scene;
    window.rotateModel = rotateModel;
    window.changeModel = changeModel;
    window.explode = explodeModel;

});