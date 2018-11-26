/*
 *
 * App
 *
 */

if ( !Detector.webgl ) Detector.addGetWebGLMessage();

app = new App();
authentication();

// For offline work, remove authentication() and uncomment the following line:
// app.init(Math.floor(Math.random()*1000000).toString());
