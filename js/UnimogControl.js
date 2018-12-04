    var io = io();
window.addEventListener('DOMContentLoaded',function(){

    io.on('translateModel', function(coord){
        translateModel(coord,null);
    });
    
    io.on('changeModel', function(model){
        changeModel(model);
    });

    io.on('scaleModel', function(scaleValue){
        scaleModel(scaleValue);
    });

    io.on('rotateModel', function(radian){
        rotateModel(radian);
    });
    
    if (WEBGL.isWebGLAvailable() === false) {

        document.body.appendChild(WEBGL.getWebGLErrorMessage());
    
    }
    
    var container, stats, clock;
    var camera, scene, renderer;
    
    init();
    animate();
    
    
    function init() {
    
        container = document.getElementById('render-box');
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
		window.camera = camera
        scene = new THREE.Scene();
    
        // load unimog model
    
        loadModel('unimog.min.json');

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
        container.appendChild(renderer.domElement);
        test = {x: -0.21637741979625671, y: 8.833897368758429, z: 27.13939097042666}
        camera.position.z = test.z
        camera.position.y = test.y
        camera.position.x = test.x
    
        controls = new THREE.OrbitControls(camera, renderer.domElement);
    
        controls.update();
    
        //
    
        stats = new Stats();
        container.appendChild(stats.dom);
    
        //
    
        window.addEventListener('resize', onWindowResize, false);
    
    }
    
    function onWindowResize() {
    
        renderer.setSize(window.innerWidth, window.innerHeight);
    
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    
    }
    
    function animate() {
    
        requestAnimationFrame(animate);
        controls.update();
    
        render();
        stats.update();
    
    }
    
    function render() {
    
        renderer.render(scene, camera);
    
    }

    function translateModel(coord,container){
        // console.log(object.getSize())
        // var lowerRightX = coord.x + object.max;
        // var upperleftY = coord.y + object.max;
        // if(lowerRightX <= container.clientWidth && x >= 0 ){
            globalUnimog.position.x += coord.x / 1000;
        // }
        // if(upperleftY <= container.clientHeight && y >= 0 ){
            globalUnimog.position.y += coord.y / 1000;
        // }
        globalUnimog.position.z += coord.z / 1000;
    }

    function rotateModel(radian){
        globalUnimog.rotation.z += Math.PI * (radian/100)/180;
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
        var loader = new THREE.AssimpJSONLoader();
        loader.load(model, function (object) {
            window.globalUnimog = object;
            object.scale.multiplyScalar(0.02);
            scene.add(object);
        });
    }

    window.scene = scene;

});
