/**
    * @module js/PeppersGhostEffect
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



THREE.PeppersGhostEffect = function ( renderer ) {

	var scope = this;

	scope.cameraDistance = 15;
	scope.reflectFromAbove = false;

	// Internals
	var _halfWidth, _width, _height;

	var _cameraF = new THREE.PerspectiveCamera(); //front
	var _cameraB = new THREE.PerspectiveCamera(); //back
	var _cameraL = new THREE.PerspectiveCamera(); //left
	var _cameraR = new THREE.PerspectiveCamera(); //right

	var _position = new THREE.Vector3();
	var _quaternion = new THREE.Quaternion();
	var _scale = new THREE.Vector3();

	// Initialization
	renderer.autoClear = false;

	this.ecm = function(camera) {
		scene.updateMatrixWorld();

		if ( camera.parent === null ) camera.updateMatrixWorld();
		camera.matrixWorld.decompose( _position, _quaternion, _scale );
	}

	this.setSize = function ( width, height ) {

		_halfWidth = width / 2;
		if ( width < height ) {

			_width = width / 3;
			_height = width / 3;

		} else {

			_width = height / 3;
			_height = height / 3;

		}
		renderer.setSize( width, height );

	};

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === null ) camera.updateMatrixWorld();

		// front
		_cameraB.position.copy( _position );
		_cameraB.quaternion.copy( _quaternion );
		_cameraB.translateZ( scope.cameraDistance );
		// _cameraF.rotation.y += 270 * ( Math.PI / 180 );
		_cameraB.rotation.z += 180  * ( Math.PI / 180 );
		window.cf = _cameraF;
		_cameraB.lookAt( scene.position );

		// back
		_cameraF.position.copy( _position );
		_cameraF.quaternion.copy( _quaternion );
	//	_cameraB.translateZ( - ( scope.cameraDistance ) );
    _cameraF.translateZ( scope.cameraDistance );
		_cameraF.lookAt( scene.position );
	  _cameraF.rotation.z += 180 * ( Math.PI / 180 );

		// left
		_cameraL.position.copy( _position );
		_cameraL.quaternion.copy( _quaternion );
		_cameraL.translateZ( scope.cameraDistance );
		_cameraL.lookAt( scene.position );
		_cameraL.rotation.z += 270 * ( Math.PI / 180 );

		// right
		_cameraR.position.copy( _position );
		_cameraR.quaternion.copy( _quaternion );
		_cameraR.translateZ( scope.cameraDistance );
		_cameraR.lookAt( scene.position );
		_cameraR.rotation.z -= 270 * ( Math.PI / 180 );


		renderer.clear();
		renderer.setScissorTest( true );

		renderer.setScissor( _halfWidth - ( _width / 2 ), ( _height * 2 ), _width, _height );
		renderer.setViewport( _halfWidth - ( _width / 2 ), ( _height * 2 ), _width, _height );

		if ( scope.reflectFromAbove ) {

			renderer.render( scene, _cameraB );

		} else {

			renderer.render( scene, _cameraF );

		}

		renderer.setScissor( _halfWidth - ( _width / 2 ), 0, _width, _height );
		renderer.setViewport( _halfWidth - ( _width / 2 ), 0, _width, _height );

		if ( scope.reflectFromAbove ) {

			renderer.render( scene, _cameraF );

		} else {

			renderer.render( scene, _cameraB );

		}

		renderer.setScissor( _halfWidth - ( _width / 2 ) - _width, _height, _width, _height );
		renderer.setViewport( _halfWidth - ( _width / 2 ) - _width, _height, _width, _height );

		if ( scope.reflectFromAbove ) {

			renderer.render( scene, _cameraR );

		} else {

			renderer.render( scene, _cameraL );

		}

		renderer.setScissor( _halfWidth + ( _width / 2 ), _height, _width, _height );
		renderer.setViewport( _halfWidth + ( _width / 2 ), _height, _width, _height );

		if ( scope.reflectFromAbove ) {

			renderer.render( scene, _cameraL );

		} else {

			renderer.render( scene, _cameraR );

		}

		renderer.setScissorTest( false );

	};


};
