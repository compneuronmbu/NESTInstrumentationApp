import numpy as np


def modCopy(orig, diff):
    """Create copy of dict orig, update with diff, return."""
    assert(isinstance(orig, dict))
    assert(isinstance(diff, dict))

    tmp = orig.copy()
    tmp.update(diff)
    return tmp


def make_layers(params):
    """Build list of layers and models for HT Model."""
    nrnmod = 'ht_neuron'

    # Default parameter values in ht_neuron are for excitatory
    # cortical cells. For inhibitory and thalamic cells, we
    # have modified parameters from [1], Tables 2, 3.
    # To model absence of various intrinsic currents, we set their
    # peak conductance to zero. By default, all intrinsic currents
    # are active.
    #
    # g_KL is set to 1.0, the value for the awake state.

    # No I_T, I_h in cortical excitatory cells
    ctxExPars = {'g_peak_T': 0.0,
                 'g_peak_h': 0.0}

    # But L56 has I_h
    ctxExL56Pars = {'g_peak_T': 0.0,
                    'g_peak_h': 1.0}

    # 'spike_duration': 1.0

    # No I_T, I_h in cortical inhibitory cells
    ctxInPars = {'tau_m': 8.0,
                 'theta_eq': -53.0,
                 'tau_theta': 1.0,
                 'tau_spike': 0.5,
                 'g_peak_T': 0.0,
                 'g_peak_h': 0.0}

    # Thalamic neurons have no I_KNa
    thalPars = {'tau_m': 8.0,
                'theta_eq': -53.0,
                'tau_theta': 0.75,
                'tau_spike': 0.75,
                'E_rev_GABA_A': -80.0,
                'g_peak_KNa': 0.0}

    # Reticular neurons have no I_KNa, I_h
    # We assume that the "thalamic" line of Table 2 applies to
    # reticular neurons as well.
    reticPars = {'tau_m': 8.0,
                 'theta_eq': -53.0,
                 'tau_theta': 0.75,
                 'tau_spike': 0.75,
                 'g_peak_KNa': 0.0,
                 'g_peak_h': 0.0}

    models = [(nrnmod, 'Relay', thalPars),
              (nrnmod, 'Inter', thalPars),
              (nrnmod, 'RpNeuron', reticPars),
              ('sinusoidal_poisson_generator', 'RetinaNode',
               {'amplitude': params['ret_amplitude'],
                'rate': params['ret_rate'],
                'frequency': params['temporal_frequency'],
                'phase': 0.0,
                'individual_spike_trains': False
                })]

    # Build lists of cortical models using list comprehension.
    models += [(nrnmod, layer + 'pyr', ctxExPars) for layer in ('L23', 'L4')]
    models += [(nrnmod, layer + 'pyr', ctxExL56Pars) for layer in ('L56',)]
    models += [(nrnmod, layer + 'in', ctxInPars)
               for layer in ('L23', 'L4', 'L56')]

    # Add synapse models, which differ only in receptor type.
    # We first obtain the mapping of receptor names to recptor indices from the
    # ht_neuron, then add the synapse model information to the models list.

    # Hard coded to be independent of NEST
    ht_rc = {u'AMPA': 1, u'GABA_A': 3, u'GABA_B': 4, u'NMDA': 2}
    # ht_rc = nest.GetDefaults('ht_neuron')['receptor_types']

    syn_models = [('static_synapse', syn, {'receptor_type': ht_rc[syn]})
               for syn in ('AMPA', 'NMDA', 'GABA_A', 'GABA_B')]

    # now layers, primary and secondary pathways
    layerRandom = {'positions': [[np.random.uniform(-params['visSize'] / 2.0,
                                                    params['visSize'] / 2.0),
                                  np.random.uniform(-params['visSize'] / 2.0,
                                                    params['visSize'] / 2.0)]
                                 for j in range(800)],
                   'extent': [params['visSize'], params['visSize']],
                   'edge_wrap': True}
    layerPropsP = {'rows': params['Np'],
                   'columns': params['Np'],
                   'extent': [params['visSize'], params['visSize']],
                   # 'center': [-1., 1.5],
                   'edge_wrap': True}
    layerPropsS = {'rows': params['Ns'],
                   'columns': params['Ns'],
                   'extent': [params['visSize'], params['visSize']],
                   'edge_wrap': True}

    layers = [('Input Ret', modCopy(layerPropsP, {'elements': 'RetinaNode'})),
              ('Rndm', modCopy(layerRandom, {'elements': 'RetinaNode'})),
              ('RetParrot', modCopy(layerPropsP,
                                    {'elements': 'parrot_neuron'})),
              ('Tp', modCopy(layerPropsP, {'elements': ['Relay', 'Inter']})),
              ('Rp', modCopy(layerPropsP, {'elements': 'RpNeuron'})),
              ('Vp_h', modCopy(layerPropsP, {'elements':
                                             ['L23pyr', 2, 'L23in', 1,
                                              'L4pyr', 2, 'L4in', 1,
                                              'L56pyr', 2, 'L56in', 1]})),
              ('Vp_v', modCopy(layerPropsP, {'elements':
                                             ['L23pyr', 2, 'L23in', 1,
                                              'L4pyr', 2, 'L4in', 1,
                                              'L56pyr', 2, 'L56in', 1]})),
              ('Ts', modCopy(layerPropsS, {'elements': ['Relay', 'Inter']})),
              ('Rs', modCopy(layerPropsS, {'elements': 'RpNeuron'})),
              ('Vs_h', modCopy(layerPropsS, {'elements':
                                             ['L23pyr', 2, 'L23in', 1,
                                              'L4pyr', 2, 'L4in', 1,
                                              'L56pyr', 2, 'L56in', 1]})),
              ('Vs_c', modCopy(layerPropsS, {'elements':
                                             ['L23pyr', 2, 'L23in', 1,
                                              'L4pyr', 2, 'L4in', 1,
                                              'L56pyr', 2, 'L56in', 1]})),
              ('Vs_v', modCopy(layerPropsS, {'elements':
                                             ['L23pyr', 2, 'L23in', 1,
                                              'L4pyr', 2, 'L4in', 1,
                                              'L56pyr', 2, 'L56in', 1]}))
              ]

    return layers, models, syn_models
