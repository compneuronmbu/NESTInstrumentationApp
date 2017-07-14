const App = require( '../static/js/layerSelect.js' );
const DevicePlots = require( '../static/js/devicePlots.js' );
const spike_det = {"senders":[1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499],"times":[1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8,9,9,9,9]};
const rec_dev = {"V_m":[[-70,-70,-70,-70],[-69.96517328370601,-69.97058344797023,-69.97411530833868,-69.96469057409006],[-69.73877348405927,-69.76270592265867,-69.79392409469823,-69.73867196291485],[-69.26640287104746,-69.31914920527167,-69.37309320711462,-69.28635861129042],[-68.54020218833176,-68.68615389078396,-68.73379468001576,-68.63662805565743],[-67.63383563570525,-67.92980437246618,-67.95385333973516,-67.82933377509188],[-66.67929187893259,-67.1040325153895,-67.08225155921052,-66.95964160447717],[-65.70305549046087,-66.23770870006803,-66.1863651933137,-66.07525044362609],[-64.72642634511188,-65.36638351257704,-65.29973570268487,-65.18145733388278]],"times":[1,2,3,4,5,6,7,8,9]};
const timestamp = 10;
console.log = jest.fn(); // suppress output

beforeEach( () => {
    d3 = require( 'd3' );
    app = new App();
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
} );

test( 'Test DevicePlots init', () => {
    app = new App();
    let devicePlots = new DevicePlots();
} );

test( 'Test makeDevicePlot', () => {
    let devicePlots = new DevicePlots();
    devicePlots.makeDevicePlot();
    devicePlots.makeDevicePlot();
} );

test( 'Test makeXAxis', () => {
    let devicePlots = new DevicePlots();
    devicePlots.makeDevicePlot();
    devicePlots.makeXAxis( timestamp );
} );

test( 'Test makeSpikeTrain', () => {
    let devicePlots = new DevicePlots();
    devicePlots.makeDevicePlot();
    devicePlots.makeSpikeTrain( spike_det, timestamp );
} );

test( 'Test makeVoltmeterPlot', () => {
    let devicePlots = new DevicePlots();
    devicePlots.makeDevicePlot();
    devicePlots.makeVoltmeterPlot( rec_dev, timestamp );
} );
