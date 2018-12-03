window.addEventListener('DOMContentLoaded',function(){
    console.log("test");
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
        scene = new THREE.Scene();
    
        // load unimog model
    
        var loader0 = new THREE.AssimpJSONLoader();
        loader0.load('models/unimog.min.json', function (object) {
            globalUnimog = object;
            object.scale.multiplyScalar(0.02);
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
        container.appendChild(renderer.domElement);
        test = {
            "x": -8.071211969397641,
            "y": 4,
            "z": -5.903857835775881
        }
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

    function translate(object,coord,container){
        // console.log(object.getSize())
        // var lowerRightX = coord.x + object.max;
        // var upperleftY = coord.y + object.max;
        // if(lowerRightX <= container.clientWidth && x >= 0 ){
            object.position.x += coord.x;
        // }
        // if(upperleftY <= container.clientHeight && y >= 0 ){
            object.position.y += coord.y;
        // }
        object.position.z += coord.z;
    }

    window.translate = translate;


});
