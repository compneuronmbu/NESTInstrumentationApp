# -*- coding: utf-8 -*-
#
# define_brunel.py
#
# This file is part of the NEST Connection App.
#
# Copyright (C) 2004 The NEST Initiative
#
# NEST Connection App is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 2 of the License, or
# (at your option) any later version.
#
# NEST Connection App is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with NEST Connection App.  If not, see <http://www.gnu.org/licenses/>.

"""
Definition of spatially extended Brunel network.

This module provides layer and projections declarations suitable for
use with the NEST Topology Module.

It defines a Brunel-style network with neurons places on a regular grid.
Connectivity is probabilitstic from the entire network, i.e., connectivity
is not structured spatially.
"""

from copy import deepcopy
from math import sqrt


class Parameters:
    """ 
    Define model parameters.
    """

    order = 400
    NE = 4 * order  # number of excitatory neurons.
    NI = 1 * order  # number of inhibitory neurons

    lengthE = int(sqrt(NE))
    lengthI = int(sqrt(NI))
    assert lengthE**2 == NE and lengthI**2 == NI
    
    neuron_model = 'iaf_psc_alpha'
    stimulator_model = 'poisson_generator'
    recorder_model = 'voltmeter'
    detector_model = 'spike_detector'

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
    stimulator_params = {"rate": p_rate}
    recorder_params = {}
    detector_params = {}

    
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
    """
    Returns lists of dictionaries with model, layer, and synapse model specifications.
    """

    P = Parameters
    
    models = [(P.stimulator_model, 'stimulator', P.stimulator_params),
              (P.neuron_model, 'excitatory', P.neuron_params),
              (P.neuron_model, 'inhibitory', P.neuron_params),
              (P.detector_model, 'spikedet', P.detector_params),
              (P.recorder_model, 'vmeter', P.recorder_params)]

    syn_models = [('static_synapse', 'static_excitatory', {})]

    layers = [('PoissonGenerator', {'rows': 1, 'columns': 1,
                                    'elements': 'stimulator'}),
              ('Excitatory', {'rows': P.lengthE, 'columns': P.lengthE,
                              'edge_wrap': True,
                              'elements': 'excitatory'}),
              ('Inhibitory', {'rows': P.lengthI, 'columns': P.lengthI,
                              'edge_wrap': True,
                              'elements': 'inhibitory'}),
              ('SpikeDetector', {'rows': 1, 'columns': 1,
                                 'elements': 'spikedet'}),
              ('Voltmeter_A', {'rows': 1, 'columns': 1,
                              'elements': 'vmeter'}),
              ('Voltmeter_B', {'rows': 1, 'columns': 1,
                               'elements': 'vmeter'})]

    return layers, models, syn_models


def make_connections():
    """
    Returns list of dictionaries specifying projections for Brunel network.
    """

    P = Parameters

    projections = [('Excitatory', 'Excitatory',
                    {'connection_type': 'convergent',
                     'synapse_model': 'static_synapse',
                     'kernel': P.epsilon,
                     'weights': P.J_ex,
                     'delays': P.delay}),
                   ('Excitatory', 'Inhibitory',
                    {'connection_type': 'convergent',
                     'synapse_model': 'static_synapse',
                     'kernel': P.epsilon,
                     'weights': P.J_ex,
                     'delays': P.delay}),
                   ('Inhibitory', 'Excitatory',
                    {'connection_type': 'convergent',
                     'synapse_model': 'static_synapse',
                     'kernel': P.epsilon,
                     'weights': P.J_in,
                     'delays': P.delay}),
                   ('Inhibitory', 'Excitatory',
                    {'connection_type': 'convergent',
                     'synapse_model': 'static_synapse',
                     'kernel': P.epsilon,
                     'weights': P.J_in,
                     'delays': P.delay})]

    return projections


def presim_setup(nest_layers, **kwargs):
    """
    Function to call before simulating from App.
    May perform some setup.
    """
    
    pass
