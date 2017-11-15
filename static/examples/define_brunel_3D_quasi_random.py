# -*- coding: utf-8 -*-
#
# define_brunel_3D.py
#
# This file is part of the NEST Instrumentation App.
#
# Copyright (C) 2004 The NEST Initiative
#
# NEST Instrumentation App is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 2 of the License, or
# (at your option) any later version.
#
# NEST Instrumentation App is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with NEST Instrumentation App.  If not, see <http://www.gnu.org/licenses/>.

"""
Definition of spatially extended Brunel network.
This module provides layer and projections declarations suitable for
use with the NEST Topology Module.
It defines a Brunel-style network with neurons placed on a regular grid.
Connectivity is probabilitstic from the entire network, i.e., connectivity
is not structured spatially.
"""

from copy import deepcopy
from math import sqrt
import numpy as np
import sobol_lib as sl

class Parameters:
    """ 
    Define model parameters.
    """

    order = 4000
    NE = 4 * order  # number of excitatory neurons.
    NI = 1 * order  # number of inhibitory neurons

    # lengthE = int(sqrt(NE))
    # lengthI = int(sqrt(NI))
    # assert lengthE**2 == NE and lengthI**2 == NI
    
    neuron_model = 'iaf_psc_alpha'

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

    neuron_params = {"C_m": 1.0,
                     "tau_m": tauMem,
                     "t_ref": 2.0,
                     "E_L": 0.0,
                     "V_reset": 0.0,
                     "V_m": 0.0,
                     "V_th": theta}

    
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

    def seed():
        return np.random.randint(1000, 10000)

    P = Parameters

    models = [(P.neuron_model, 'excitatory', P.neuron_params),
              (P.neuron_model, 'inhibitory', P.neuron_params)]

    syn_models = [('static_synapse', 'static_excitatory', {})]

    print("Generating positions...")

    # Generate all the positions first to avoid overlapping.
    quasi_rand_pos = sl.i4_sobol_generate(3, P.NE + P.NI, seed())
    print("Number of points: {}".format(len(quasi_rand_pos[0])))
    quasi_rand_excitatory = [quasi_rand_pos[0][:P.NE],
                             quasi_rand_pos[1][:P.NE],
                             quasi_rand_pos[2][:P.NE]]
    quasi_rand_inhibitory = [quasi_rand_pos[0][P.NE:],
                             quasi_rand_pos[1][P.NE:],
                             quasi_rand_pos[2][P.NE:]]

    dxyzE = 1.0 / float( P.NE )
    ex_start_pos = - ( ( 1.0 - dxyzE ) / 2.0 )
    ex_end_pos = ( 1.0 - dxyzE ) / 2.0
    ex_pos = [ex_start_pos + quasi_rand_excitatory[0] * (ex_end_pos - ex_start_pos),
              ex_start_pos + quasi_rand_excitatory[1] * (ex_end_pos - ex_start_pos),
              ex_start_pos + quasi_rand_excitatory[2] * (ex_end_pos - ex_start_pos)]


    dxyzI = 1.0 / float( P.NI )
    in_start_pos = - ( ( 1.0 - dxyzI ) / 2.0 )
    in_end_pos = ( 1.0 - dxyzI ) / 2.0
    in_pos = [in_start_pos + quasi_rand_inhibitory[0] * (in_end_pos - in_start_pos),
              in_start_pos + quasi_rand_inhibitory[1] * (in_end_pos - in_start_pos),
              in_start_pos + quasi_rand_inhibitory[2] * (in_end_pos - in_start_pos)]

    excitatory_positions = [[ex_pos[0][i],
                             ex_pos[1][i],
                             ex_pos[2][i]] for i in range(P.NE)]
    inhibitory_positions = [[in_pos[0][i],
                             in_pos[1][i],
                             in_pos[2][i]] for i in range(P.NI)]

    print("Generating layers...")
    layers = [('Excitatory', {'positions': excitatory_positions,
                              'edge_wrap': True,
                              'neuronType': 'excitatory',
                              'elements': 'excitatory'}),
              ('Inhibitory', {'positions': inhibitory_positions,
                              'edge_wrap': True,
                              'neuronType': 'inhibitory',
                              'elements': 'inhibitory'})]

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
