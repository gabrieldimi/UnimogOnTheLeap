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
var desiredVolume = 200;
var globalUnimog;
var zRotationChange = 5;
var cube;
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
    uncover.addEventListener('click', pullApartCube)

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
     		window.camera = camera
        scene = new THREE.Scene();
        window.scene = scene;

        // load unimog model
        loadModel('unimog.min.json',globalUnimog);
        // loadModel('gaggenauCube.json',cube);

        loader.load('gaggenauCube.json', function (object) {
            cube = object;
            var desiredFactor = uniformScale(600,object);
            object.scale.multiplyScalar(desiredFactor);
            object.traverse(function(node){
                if(node.material){
                    node.material.side = THREE.DoubleSide;
                }
            });
            scene.add(object);
        });



        var ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        scene.add(ambientLight);

        var directionalLight = new THREE.DirectionalLight(0xeeeeee);
        directionalLight.position.set(1, 1, - 1);
        directionalLight.position.normalize();
        scene.add(directionalLight);

        //

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

        //

        stats = new Stats();
        container.appendChild(stats.dom);

        //

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
          // renderer.render(scene, camera)
    }

    function translateModel(coord,container){
        if(uncovered){
          globalUnimog.position.x += coord.x / 1000;
          globalUnimog.position.y += coord.y / 1000;

              globalUnimog.position.z += coord.z / 1000;

        }
    }


    function rotateModel(direction,x,y,radius){
        // var zLokal = calculateRotationDegree(x,y,radius);
        // delta = Math.max(zLokal,zGlobal) - Math.min(zLokal, zGlobal)
        if(direction){
            globalUnimog.rotation.z += zRotationChange;
        }else{
            globalUnimog.rotation.z -= zRotationChange;
        }
        // zGlobal = zLokal;
    }

    function changeModel(nextModelUrl){
        scene.remove(window.globalUnimog);
        loadModel(nextModelUrl);
    }


    function scaleModel(scaleValue){
        scaleValue /= 100;
        globalUnimog.scale.set(scaleValue,scaleValue,scaleValue);
    }


    function loadModel(model){
        loader.load(model, function (object) {
            globalUnimog = object;
            var desiredFactor = uniformScale(desiredVolume,object);
            object.scale.multiplyScalar(desiredFactor);
            scene.add(object);
            displayUnimogModel.textContent = model;
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
        var desiredFactor = uniformScale(desiredVolume,globalUnimog);
        globalUnimog.scale.multiplyScalar(desiredFactor);
        console.log("unimog's position reseted");
    }

    function calculateRotationDegree(x,y,radius){
        var radian = Math.atan2((y/radius),(x/radius));
        var degree = (((radian * 180 / Math.PI) + 360) % 360);
        // console.log(`x: ${x}, y: ${y} radius: ${radius}, degree ${degree}`);
        return degree;
    }


    function pullApartCube(){
        if(cube && Math.abs(cube.children[0].position.x - cube.children[1].position.x) <= 20){
          cube.children[0].position.x -=10;
          cube.children[1].position.x +=10;
          uncovered = true;
        }else{
          scene.remove(cube);
          console.log("cube removed")
        }

    }


    window.scene = scene;
    window.rotateModel = rotateModel;
    window.calculateRotationDegree= calculateRotationDegree;

});

function getChildren(elem, given) {
var arr = given || []
if(elem.children.length > 0) {
	for(let i =0; i < elem.children.length; i++) {
		getChildren(elem.children[i],arr)
	}
} else {
arr.push(elem)
}

return arr;
}

function explode(val) {
  children = getChildren(globalUnimog);
  for(var i = 0; i < children.length; i++) {
    var elem = children[i];
    var v = new THREE.Vector3();
    v.copy(elem.position);
    elem.localToWorld(v);
    globalUnimog.worldToLocal(v);
    coords = ['x', 'y', 'z']
    for(let i = 0; i < coords.length; i++) {
      if(v[coords[i]] >= 0) {
      	elem.position[coords[i]] += 1
      } else {
      	elem.position[coords[i]] -= 1
      }
    }
  }
}
