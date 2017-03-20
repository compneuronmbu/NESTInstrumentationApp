"""
Definition of partial Hill-Tononi (2005) Model.

This module provides layer and projections declarations suitable for
use with the NEST Topology Module.

The file defines a Hill-Tononi model variant limited to the primary pathway.
"""

from copy import deepcopy
import numpy as np

params = {
    'Np': 40,                   # Number of rows and columns in primary nodes
    'visSize': 8.0,             # Extent of the layer
    'ret_rate': 45.0,           # Rate in the retina nodes
    'ret_amplitude': 45.0,      # Amplitude in the retina nodes
    'temporal_frequency': 2.0,  # Frequency of the retina nodes (Hz)
    'lambda_dg': 2.0,           # wavelength of drifting grating
    'phi_dg': 0.0               # normal direction of grating (degrees)
}


def modified_copy(orig, diff):
    """
    Returns a deep copy of dictionary with changes applied.

    @param orig  original dictionary, will be deep-copied
    @param diff  copy will be updated with this dict
    """

    tmp = deepcopy(orig)
    tmp.update(diff)
    return tmp


def make_layers():
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
    syn_models = [('static_synapse', syn, {'receptor_type': ht_rc[syn]})
               for syn in ('AMPA', 'NMDA', 'GABA_A', 'GABA_B')]

    # now layers, primary and secondary pathways
    layerPropsP = {'rows': params['Np'],
                   'columns': params['Np'],
                   'extent': [params['visSize'], params['visSize']],
                   'edge_wrap': True}

    layers = [('SinPoissonGenerator_A', modified_copy(layerPropsP,
                                                {'rows': 1, 'columns': 1, 'elements': 'RetinaNode'})),
              ('SinPoissonGenerator_B', modified_copy(layerPropsP,
                                                {'rows': 1, 'columns': 1, 'elements': 'RetinaNode'})),
              ('Tp', modified_copy(layerPropsP, {'elements': ['Relay', 'Inter']})),
              ('Rp', modified_copy(layerPropsP, {'elements': 'RpNeuron'})),
              ('Vp_h', modified_copy(layerPropsP, {'elements':
                                             ['L23pyr', 2, 'L23in', 1,
                                              'L4pyr', 2, 'L4in', 1,
                                              'L56pyr', 2, 'L56in', 1]})),
              ('Vp_v', modified_copy(layerPropsP, {'elements':
                                             ['L23pyr', 2, 'L23in', 1,
                                              'L4pyr', 2, 'L4in', 1,
                                              'L56pyr', 2, 'L56in', 1]})),
              ('Voltmeter_A', modified_copy(layerPropsP,{'rows': 1, 'columns': 1, 'elements': 'voltmeter'})),
              ('Voltmeter_B', modified_copy(layerPropsP,{'rows': 1, 'columns': 1, 'elements': 'voltmeter'}))
              ]

    return layers, models, syn_models


def make_connections():
    """
    Return list of dictionaries specifying connectivity.

    NOTE: Connectivity is modified from Hill-Tononi for simplicity.
    """
    
    # scaling parameters from grid elements to visual angle
    dpcP = params['visSize'] / (params['Np'] - 1)

    # ---------- PRIMARY PATHWAY ------------------------------------

    ccConnections = []
    ccxConnections = []
    ctConnections = []

    horIntraBase = {"connection_type": "divergent",
                    "synapse_model": "AMPA",
                    "mask": {"circular": {"radius": 12.0 * dpcP}},
                    "kernel": {"gaussian": {"p_center": 0.05, "sigma": 7.5 * dpcP}},
                    "weights": 1.0,
                    "delays": {"uniform": {"min": 1.75, "max": 2.25}}}
    
    for conn in [{"sources": {"model": "L23pyr"}, "targets": {"model": "L23pyr"}},
                 {"sources": {"model": "L23pyr"}, "targets": {"model": "L23pyr"}, 'synapse_model': 'NMDA'},
                 {"sources": {"model": "L23pyr"}, "targets": {"model": "L23in" }},
                 {"sources": {"model": "L4pyr" }, "targets": {"model": "L4pyr" },
                  "mask"   : {"circular": {"radius": 7.0 * dpcP}}},
                 {"sources": {"model": "L4pyr" }, "targets": {"model": "L4in"  },
                  "mask"   : {"circular": {"radius": 7.0 * dpcP}}},
                 {"sources": {"model": "L56pyr"}, "targets": {"model": "L56pyr" }},
                 {"sources": {"model": "L56pyr"}, "targets": {"model": "L56in"  }}]:
        ndict = horIntraBase.copy()
        ndict.update(conn)
        ccConnections.append(ndict)
        
    verIntraBase = {"connection_type": "divergent",
                    "synapse_model": "AMPA",
                    "mask": {"circular": {"radius": 2.0 * dpcP}},
                    "kernel": {"gaussian": {"p_center": 1.0, "sigma": 7.5 * dpcP}},
                    "weights": 2.0,
                    "delays": {"uniform": {"min": 1.75, "max": 2.25}}}
    
    for conn in [{"sources": {"model": "L23pyr"}, "targets": {"model": "L56pyr"}, "weights": 1.0},
                 {"sources": {"model": "L23pyr"}, "targets": {"model": "L56pyr"}, "weights": 1.0, 'synapse_model': 'NMDA'},
                 {"sources": {"model": "L23pyr"}, "targets": {"model": "L56in" }, "weights": 1.0},
                 {"sources": {"model": "L4pyr" }, "targets": {"model": "L23pyr"}},
                 {"sources": {"model": "L4pyr" }, "targets": {"model": "L23in" }},
                 {"sources": {"model": "L56pyr"}, "targets": {"model": "L23pyr"}},
                 {"sources": {"model": "L56pyr"}, "targets": {"model": "L23in" }},
                 {"sources": {"model": "L56pyr"}, "targets": {"model": "L4pyr" }},
                 {"sources": {"model": "L56pyr"}, "targets": {"model": "L4in"  }}]:
        ndict = verIntraBase.copy()
        ndict.update(conn)
        ccConnections.append(ndict)

    intraInhBase = {"connection_type": "divergent",
                    "synapse_model": "GABA_A",
                    "mask": {"circular": {"radius": 7.0 * dpcP}},
                    "kernel": {"gaussian": {"p_center": 0.25, "sigma": 7.5 * dpcP}},
                    "weights": 1.0,
                    "delays": {"uniform": {"min": 1.75, "max": 2.25}}}

    for conn in [{"sources": {"model": "L23in"}, "targets": {"model": "L23pyr"}},
                 {"sources": {"model": "L23in"}, "targets": {"model": "L23in" }},
                 {"sources": {"model": "L4in" }, "targets": {"model": "L4pyr" }},
                 {"sources": {"model": "L4in" }, "targets": {"model": "L4in"  }},
                 {"sources": {"model": "L56in"}, "targets": {"model": "L56pyr"}},
                 {"sources": {"model": "L56in"}, "targets": {"model": "L56in" }}]:
        ndict = intraInhBase.copy()
        ndict.update(conn)
        ccConnections.append(ndict)
        ccxConnections.append(ndict)

    intraInhBaseB = {"connection_type": "divergent",
                     "synapse_model": "GABA_B",
                     "mask": {"circular": {"radius": 1.0 * dpcP}},
                     "kernel": 0.3,
                     "weights": 1.0,
                     "delays": {"uniform": {"min": 1.75, "max": 2.25}}}
    
    for conn in [{"sources": {"model": "L23in"}, "targets": {"model": "L23pyr"}},
                 {"sources": {"model": "L4in" }, "targets": {"model": "L4pyr" }},
                 {"sources": {"model": "L56in"}, "targets": {"model": "L56pyr" }}]:
        ndict = intraInhBaseB.copy()
        ndict.update(conn)
        ccConnections.append(ndict)
        ccxConnections.append(ndict)
        
    corThalBase = {"connection_type": "divergent",
                   "synapse_model": "AMPA",
                   "mask": {"circular": {"radius": 5.0 * dpcP}},
                   "kernel": {"gaussian": {"p_center": 0.5, "sigma": 7.5 * dpcP}},
                   "weights": 1.0,
                   "delays": {"uniform": {"min": 7.5, "max": 8.5}}}
    
    for conn in [{"sources": {"model": "L56pyr"}, "targets": {"model": "Relay" }},
                 {"sources": {"model": "L56pyr"}, "targets": {"model": "Inter" }}]:
        ndict = corThalBase.copy()
        ndict.update(conn)
        ctConnections.append(ndict)
        
    corRet = corThalBase.copy()
    corRet.update({"sources": {"model": "L56pyr"}, "targets": {"model": "RpNeuron"}, "weights": 2.5})

    # build complete list of connections, build populations names
    allconns = []

    #! Cortico-cortical, same orientation
    [allconns.append(['Vp_h','Vp_h',c]) for c in ccConnections]
    [allconns.append(['Vp_v','Vp_v',c]) for c in ccConnections]
    
    #! Cortico-cortical, cross-orientation
    [allconns.append(['Vp_h','Vp_v',c]) for c in ccxConnections]
    [allconns.append(['Vp_v','Vp_h',c]) for c in ccxConnections]

    #! Cortico-thalamic connections
    [allconns.append(['Vp_h','Tp',c]) for c in ctConnections]
    [allconns.append(['Vp_v','Tp',c]) for c in ctConnections]

    [allconns.append(['Vp_h','Rp',c]) for c in [corRet]]
    [allconns.append(['Vp_v','Rp',c]) for c in [corRet]]

    #! Thalamo-cortical connections
    thalCorRect = {"connection_type": "convergent",
                   "sources": {"model": "Relay"},
                   "synapse_model": "AMPA",
                   "weights": 5.0,
                   "delays": {"uniform": {"min": 2.75, "max": 3.25}}}

    #! Horizontally tuned
    thalCorRect.update({"mask": {"rectangular": {"lower_left" : [-4.05*dpcP, -1.05*dpcP],
                                                 "upper_right": [ 4.05*dpcP,  1.05*dpcP]}}})
    for conn in [{"targets": {"model": "L4pyr" }, "kernel": 0.5},
                 {"targets": {"model": "L56pyr"}, "kernel": 0.3}]:
        thalCorRect.update(conn)
        allconns.append(['Tp','Vp_h', thalCorRect.copy()])

    #! Vertically tuned
    thalCorRect.update({"mask": {"rectangular": {"lower_left" : [-1.05*dpcP, -4.05*dpcP],
                                                 "upper_right": [ 1.05*dpcP,  4.05*dpcP]}}})
    for conn in [{"targets": {"model": "L4pyr" }, "kernel": 0.5},
                 {"targets": {"model": "L56pyr"}, "kernel": 0.3}]:
        thalCorRect.update(conn)
        allconns.append(['Tp','Vp_v', thalCorRect.copy()])

    #! Diffuse connections
    thalCorDiff = {"connection_type": "divergent",
                   "sources": {"model": "Relay"},
                   "synapse_model": "AMPA",
                   "weights": 5.0,
                   "mask": {"circular": {"radius": 5.0 * dpcP}},
                   "kernel": {"gaussian": {"p_center": 0.1, "sigma": 7.5 * dpcP}},
                   "delays": {"uniform": {"min": 2.75, "max": 3.25}}}
    
    for conn in [{"targets": {"model": "L4in" }},
                 {"targets": {"model": "L56in"}}]:
        thalCorDiff.update(conn)
        allconns.append(['Tp','Vp_h', thalCorDiff.copy()])
        allconns.append(['Tp','Vp_v', thalCorDiff.copy()])

    #! Thalamic connections
    thalBase = {"connection_type": "divergent",
                "delays": {"uniform": {"min": 1.75, "max": 2.25}}}

    for src, tgt, conn in [('Tp', 'Rp', {"sources": {"model": "Relay"},
                                         "synapse_model": "AMPA",
                                         "mask": {"circular": {"radius": 2.0 * dpcP}},
                                         "kernel": {"gaussian": {"p_center": 1.0, "sigma": 7.5 * dpcP}},
                                         "weights": 2.0}),
                           ('Tp', 'Tp', {"sources": {"model": "Inter"},
                                         "targets": {"model": "Relay"}, "synapse_model": "GABA_A",
                                         "mask": {"circular": {"radius": 2.0 * dpcP}},
                                         "weights": 1.0,
                                         "kernel": {"gaussian": {"p_center": 0.25, "sigma": 7.5 * dpcP}}}),
                           ('Tp', 'Tp', {"sources": {"model": "Inter"},
                                         "targets": {"model": "Inter"}, "synapse_model": "GABA_A",
                                         "mask": {"circular": {"radius": 2.0 * dpcP}},
                                         "weights": 1.0,
                                         "kernel": {"gaussian": {"p_center": 0.25, "sigma": 7.5 * dpcP}}}),
                           ('Rp', 'Tp', {"targets": {"model": "Relay"},
                                         "mask": {"circular": {"radius": 12.0 * dpcP}}, "synapse_model": "GABA_A",
                                         "weights": 1.0,
                                         "kernel": {"gaussian": {"p_center": 0.15, "sigma": 7.5 * dpcP}}}),
                           ('Rp', 'Tp', {"targets": {"model": "Relay"},
                                         "mask": {"circular": {"radius": 12.0 * dpcP}}, "synapse_model": "GABA_B",
                                         "weights": 1.0,
                                         "kernel": {"gaussian": {"p_center": 0.05, "sigma": 7.5 * dpcP}}}),
                           ('Rp', 'Tp', {"targets": {"model": "Inter"},
                                         "mask": {"circular": {"radius": 12.0 * dpcP}}, "synapse_model": "GABA_A",
                                         "weights": 1.0,
                                         "kernel": {"gaussian": {"p_center": 0.15, "sigma": 7.5 * dpcP}}}),
                           ('Rp', 'Tp', {"targets": {"model": "Inter"},
                                         "mask": {"circular": {"radius": 12.0 * dpcP}}, "synapse_model": "GABA_B",
                                         "weights": 1.0,
                                         "kernel": {"gaussian": {"p_center": 0.05, "sigma": 7.5 * dpcP}}}),
                           ('Rp', 'Rp', {"mask": {"circular": {"radius": 12.0 * dpcP}}, "synapse_model": "GABA_B",
                                         "weights": 1.0,
                                         "kernel": {"gaussian": {"p_center": 0.5, "sigma": 7.5 * dpcP}}})]:
        thal = thalBase.copy()
        thal.update(conn)
        allconns.append([src,tgt,thal])

    # Now fix Gaussians
    for conn in allconns:
        cdict = conn[2]
        kern = cdict["kernel"]
        if isinstance(kern, dict) and "gaussian" in kern:
            
            assert(cdict["connection_type"] == "divergent")

            # find correct spatial-to-grid factor, depends on target (no Gaussian convergent conns.)
            lam = dpcS if conn[1][:2] in ('Ts', 'Rs', 'Vs') else dpcP

            # get mask size, assume here all are circular, radius is r * lam
            assert("circular" in cdict["mask"])
            r = cdict["mask"]["circular"]["radius"] / lam

            # get current sigma, which is w * lam
            sig = kern["gaussian"]["sigma"]

            # compute new sigma
            nsig = (2*r+1)*lam/(2*np.pi)*np.sqrt(0.5*sig/lam)

            # set new sigma
            kern["gaussian"]["sigma"] = nsig
            
            # print '%10.2f -> %10.2f (lam = %10.2f)' % (sig, nsig, lam)

    # Now fix masks
    for conn in allconns:
        cdict = conn[2]
        mask = cdict["mask"]
        if "circular" in mask:

            # find correct spatial-to-grid factor
            if cdict["connection_type"] == "divergent":
                lam = dpcS if conn[1][:2] in ('Ts', 'Rs', 'Vs') else dpcP
            else: # convergent, look at source
                lam = dpcS if conn[0][:2] in ('Ts', 'Rs', 'Vs') else dpcP

            # radius in grid units
            r = mask["circular"]["radius"] / lam

            # corner dislocation from center for edge length 2r+1, in spatial units
            d = 0.5 * (2*r+1) * lam

            # new mask
            cdict["mask"]={'rectangular': {'lower_left': [-d, -d], 'upper_right': [d, d]}}
        
    return allconns


def presim_setup(nest_layers, **kwargs):
    """
    Function to call before simulating from App.
    May perform some setup.
    """
    
    pass
