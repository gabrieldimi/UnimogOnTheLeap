/**
TODO change camera position
*/
var io = io();
var zGlobal = 0;
var desiredVolume = 200;
var globalUnimog;
var cube;
window.addEventListener('DOMContentLoaded',function(){

    io.on('translateModel', translateModel);

    io.on('changeModel',changeModel);

    io.on('scaleModel',scaleModel);

    io.on('rotateModel', rotateModel);

    io.on('resetModel', resetModel);

    io.on('uncoverModel', pullApartCube)

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
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
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
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.width = '99.7%';
        renderer.domElement.style.height = '100%';
        console.log(renderer)
        container.appendChild(renderer.domElement);
        // test = {x: 0.000000000000000000000000000000000000000000000000000000000000000000000001, y: 0.000000000000000000000000000000000000000001, z:0.000000000000000000000000000000000000000000000000001}
        // camera.position.z = test.z
        // camera.position.y = test.y
        // camera.position.x = test.x

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
        if(globalUnimog) {
          display.textContent = `${globalUnimog.position.x.toFixed(3)}, ${globalUnimog.position.y.toFixed(3)}, ${globalUnimog.position.z.toFixed(3)}`
        }

    }

    function render() {

        effect.render(scene, camera);

    }

    function translateModel(coord,container){
        if(uncovered){
          globalUnimog.position.x += coord.x / 1000;
          globalUnimog.position.y += coord.y / 1000;

              globalUnimog.position.z += coord.z / 1000;

        }
    }


    function rotateModel(direction,x,y,radius){
        var zLokal = calculateRotationDegree(x,y,radius);
        delta = Math.max(zLokal,zGlobal) - Math.min(zLokal, zGlobal)
        if(direction){
            globalUnimog.rotation.z += (delta) / 10;
        }else{
            globalUnimog.rotation.z -= (delta) / 100;
        }
        zGlobal = zLokal;
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
        console.log(`x: ${x}, y: ${y} radius: ${radius}, degree ${degree}`);
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
