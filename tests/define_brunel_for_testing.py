from math import sqrt

def modCopy(orig, diff):
    """Create copy of dict orig, update with diff, return."""
    assert(isinstance(orig, dict))
    assert(isinstance(diff, dict))

    tmp = orig.copy()
    tmp.update(diff)
    return tmp


def make_layers():
    '''
    Definition of the number of neurons in the network and the number of
    neuron recorded from
    '''

    order = 2500
    NE = 4 * order  # number of excitatory neurons.
    NI = 1 * order  # number of inhibitory neurons
    # N_neurons = NE + NI  # number of neurons in total
    # N_rec = 50  # record from 50 neurons
    visSize = 10.0
    neuron_model = 'iaf_psc_alpha'
    noise_model = 'poisson_generator'
    membrane_model = 'voltmeter'
    spike_model = 'spike_detector'

    '''
    Initialization of the parameters of the integrate and fire neuron and
    the synapses.
    '''

    g = 5.0  # ratio inhibitory weight/excitatory weight
    eta = 2.0  # external rate relative to threshold rate
    epsilon = 0.1  # connection probability

    delay = 1.5  # synaptic delay in ms

    tauMem = 20.0  # time constant of membrane potential in ms
    theta = 20.0  # membrane threshold potential in mV

    J = 0.1  # postsynaptic amplitude in mV
    J_ex = J  # amplitude of excitatory postsynaptic potential
    J_in = -g * J_ex  # amplitude of inhibitory postsynaptic potential

    CE = int(epsilon * NE)  # number of excitatory synapses per neuron

    nu_th = theta / (J * CE * tauMem)
    nu_ex = eta * nu_th
    p_rate = 1000.0 * nu_ex * CE

    neuron_params = {"C_m": 1.0,
                     "tau_m": tauMem,
                     "t_ref": 2.0,
                     "E_L": 0.0,
                     "V_reset": 0.0,
                     "V_m": 0.0,
                     "V_th": theta}

    noise_params = {"rate": p_rate}

    spikes_params = {}

    ###########################################################################

    models = [(noise_model, 'input_noise', noise_params),
              (neuron_model, 'ex', neuron_params),
              (neuron_model, 'in', neuron_params),
              (spike_model, 'output_ex_spike', spikes_params),
              (spike_model, 'output_in_spike', spikes_params)]

    syn_models = [('static_synapse', 'static_excitatory', {})]

    layerPropsE = {'rows': int(sqrt(NE)),
                   'columns': int(sqrt(NE)),
                   'extent': [visSize, visSize],
                   # 'center': [-1., 1.5],
                   'edge_wrap': True}
    layerPropsI = {'rows': int(sqrt(NI)),
                   'columns': int(sqrt(NI)),
                   'extent': [visSize, visSize],
                   # 'center': [-1., 1.5],
                   'edge_wrap': True}

    layerPropsInput = {'rows': 1,
                       'columns': 1,
                       'extent': [visSize, visSize]}

    layerPropsVolt = {'rows': 1,
                       'columns': 1,
                       'extent': [visSize, visSize],
                       # 'center': [-1., 1.5],
                       'elements': membrane_model}


    layers = [('Input noise',
               modCopy(layerPropsInput, {'elements': 'input_noise'})),
              ('Excitatory', modCopy(layerPropsE, {'elements': 'ex'})),
              ('Inhibitory', modCopy(layerPropsI, {'elements': 'in'})),
              ('Ex. spike detector',
               modCopy(layerPropsInput, {'elements': 'output_ex_spike'})),
              ('In. spike detector',
               modCopy(layerPropsInput, {'elements': 'output_in_spike'})),
              ('Voltmeter', layerPropsVolt)]

    return layers, models, syn_models
