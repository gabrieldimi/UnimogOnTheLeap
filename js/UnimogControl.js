var io = io();
var zGlobal = 0;
var desiredVolume = 250;
window.addEventListener('DOMContentLoaded',function(){

    io.on('translateModel', translateModel);

    io.on('changeModel',changeModel);

    io.on('scaleModel',scaleModel);

    io.on('rotateModel', rotateModel);

    io.on('resetModel', resetModel);

    display = document.getElementById('displayPanel');

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
        window.scene = scene;
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
        renderer.domElement.style.width = '99.7%';
        renderer.domElement.style.height = '100%';
        console.log(renderer)
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
        if(coord.z >= -20 && coord.z <= camera.position.z){

            globalUnimog.position.z += coord.z / 1000;
        }
    }


    function rotateModel(direction,x,y,radius){
        var zLokal = calculateRotationDegree(x,y,radius);
        if(direction){
            globalUnimog.rotation.z += (zLokal - zGlobal) /2.5;
        }else{
            globalUnimog.rotation.z -= (zLokal - zGlobal)/2.5;
        }
        
        zGlobal += zLokal;
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
        if(radius > x){
            radius = x;
        }
        if( x > radius){
            x = radius;
        }
        var radian = Math.asin(x/radius);
    
        if(x <= 0 && y >= 0){
            radian = Math.abs(radian) + Math.PI /2;
        }else if (x <= 0 && y <= 0){
            radian = Math.abs(radian) + Math.PI;
        }else if ( x >= 0 && y <= 0){
            radian = Math.abs(radian) + (Math.PI * 3)/2;
        }else{
            radian = Math.abs(radian);
        }
        var degree = (Math.PI * (radian)/180);
        console.log(`x: ${x}, radius: ${radius}, x/radius: ${x/radius}, degree: ${degree}`);
        return degree;
    }



    window.scene = scene;
    window.rotateModel = rotateModel;
    window.calculateRotationDegree= calculateRotationDegree;

});
