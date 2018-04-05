# -*- coding: utf-8 -*-
#
# define_Potjans_Diesmann.py
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
Definition of spatially extended Potjans-Diesmann network.
This module provides layer and projections declarations suitable for
use with the NEST Topology Module.
It defines a Potjans-Diesmann-style network with neurons placed on a regular
grid. Connectivity is probabilitstic from the entire network, i.e., connectivity
is not structured spatially.
"""

from copy import deepcopy
from math import sqrt
import numpy as np
import sobol_lib as sl

def get_mean_delays(mean_delay_exc, mean_delay_inh, number_of_pop):
    """ Creates matrix containing the delay of all connections.

    Arguments
    ---------
    mean_delay_exc
        Delay of the excitatory connections.
    mean_delay_inh
        Delay of the inhibitory connections.
    number_of_pop
        Number of populations.

    Returns
    -------
    mean_delays
        Matrix specifying the mean delay of all connections.

    """

    dim = number_of_pop
    mean_delays = np.zeros((dim, dim))
    mean_delays[:, 0:dim:2] = mean_delay_exc
    mean_delays[:, 1:dim:2] = mean_delay_inh
    return mean_delays

def get_std_delays(std_delay_exc, std_delay_inh, number_of_pop):
    """ Creates matrix containing the standard deviations of all delays.

    Arguments
    ---------
    std_delay_exc
        Standard deviation of excitatory delays.
    std_delay_inh
        Standard deviation of inhibitory delays.
    number_of_pop
        Number of populations in the microcircuit.

    Returns
    -------
    std_delays
        Matrix specifying the standard deviation of all delays.

    """

    dim = number_of_pop
    std_delays = np.zeros((dim, dim))
    std_delays[:, 0:dim:2] = std_delay_exc
    std_delays[:, 1:dim:2] = std_delay_inh
    return std_delays


def get_weight(PSP_val, Param):
    """ Computes weight to elicit a change in the membrane potential.

    This function computes the weight which elicits a change in the membrane
    potential of size PSP_val. To implement this, the weight is calculated to
    elicit a current that is high enough to implement the desired change in the
    membrane potential.

    Parameters
    ----------
    PSP_val
        Evoked postsynaptic potential.
    net_dict
        Dictionary containing parameters of the microcircuit.

    Returns
    -------
    PSC_e
        Weight value(s).

    """
    C_m = Param.neuron_params['C_m']
    tau_m = Param.neuron_params['tau_m']
    tau_syn_ex = Param.neuron_params['tau_syn_ex']

    PSC_e_over_PSP_e = (((C_m) ** (-1) * tau_m * tau_syn_ex / (
        tau_syn_ex - tau_m) * ((tau_m / tau_syn_ex) ** (
            - tau_m / (tau_m - tau_syn_ex)) - (tau_m / tau_syn_ex) ** (
                - tau_syn_ex / (tau_m - tau_syn_ex)))) ** (-1))
    PSC_e = (PSC_e_over_PSP_e * PSP_val)
    return PSC_e

def get_mean_PSP_matrix(PSP_e, g, number_of_pop):
    """ Creates a matrix of the mean evoked postsynaptic potential.

    The function creates a matrix of the mean evoked postsynaptic
    potentials between the recurrent connections of the microcircuit.
    The weight of the connection from L4E to L23E is doubled.

    Arguments
    ---------
    PSP_e
        Mean evoked potential.
    g
        Relative strength of the inhibitory to excitatory connection.
    number_of_pop
        Number of populations in the microcircuit.

    Returns
    -------
    weights
        Matrix of the weights for the recurrent connections.

    """
    dim = number_of_pop
    weights = np.zeros((dim, dim))
    exc = PSP_e
    inh = PSP_e * g
    weights[:, 0:dim:2] = exc
    weights[:, 1:dim:2] = inh
    weights[0, 2] = exc * 2
    return weights

def get_std_PSP_matrix(PSP_rel, number_of_pop):
    """ Relative standard deviation matrix of postsynaptic potential created.

    The relative standard deviation matrix of the evoked postsynaptic potential
    for the recurrent connections of the microcircuit is created.

    Arguments
    ---------
    PSP_rel
        Relative standard deviation of the evoked postsynaptic potential.
    number_of_pop
        Number of populations in the microcircuit.

    Returns
    -------
    std_mat
        Matrix of the standard deviation of postsynaptic potentials.

    """
    dim = number_of_pop
    std_mat = np.zeros((dim, dim))
    std_mat[:, :] = PSP_rel
    return std_mat

class Parameters:
    """ 
    Define model parameters.
    """

    K_scaling = 0.1
    n_scaling = 0.1
    print('The number of neurons is scaled by a factor of: %.2f'
         % n_scaling)

    populations =  {'L23E': 20683, 'L23I': 5834, 'L4E': 21915, 'L4I': 5479,
                    'L5E': 4850, 'L5I': 1065, 'L6E': 14395, 'L6I': 2948}

    for layerName, n in populations.items():
        print(layerName, n)
        populations[layerName] = int(n_scaling*n)
    print(populations)
    
    neuron_model = 'iaf_psc_exp'  # 'iaf_psc_alpha'

    neuron_params = {
        # Membrane potential average for the neurons (in mV).
        'V0_mean': -58.0,
        # Standard deviation of the average membrane potential (in mV).
        'V0_sd': 10.0,
        # Reset membrane potential of the neurons (in mV).
        'E_L': -65.0,
        # Threshold potential of the neurons (in mV).
        'V_th': -50.0,
        # Membrane potential after a spike (in mV).
        'V_reset': -65.0,
        # Membrane capacitance (in pF).
        'C_m': 250.0,
        # Membrane time constant (in ms).
        'tau_m': 10.0,
        # Time constant of postsynaptic excitatory currents (in ms).
        'tau_syn_ex': 0.5,
        # Time constant of postsynaptic inhibitory currents (in ms).
        'tau_syn_in': 0.5,
        # Time constant of external postsynaptic excitatory current (in ms).
        'tau_syn_E': 0.5,
        # Refractory period of the neurons after a spike (in ms).
        't_ref': 2.0}

    conn_probs = [[0.1009, 0.1689, 0.0437, 0.0818, 0.0323, 0., 0.0076, 0.],
                  [0.1346, 0.1371, 0.0316, 0.0515, 0.0755, 0., 0.0042, 0.],
                  [0.0077, 0.0059, 0.0497, 0.135, 0.0067, 0.0003, 0.0453, 0.],
                  [0.0691, 0.0029, 0.0794, 0.1597, 0.0033, 0., 0.1057, 0.],
                  [0.1004, 0.0622, 0.0505, 0.0057, 0.0831, 0.3726, 0.0204, 0.],
                  [0.0548, 0.0269, 0.0257, 0.0022, 0.06, 0.3158, 0.0086, 0.],
                  [0.0156, 0.0066, 0.0211, 0.0166, 0.0572, 0.0197, 0.0396, 0.2252],
                  [0.0364, 0.001, 0.0034, 0.0005, 0.0277, 0.008, 0.0658, 0.1443]]

    mean_delay_exc = 1.5
    mean_delay_inh = 0.75
    rel_std_delay = 0.5
    g = -4
    PSP_e =  0.15
    PSP_sd = 0.1

    mean_delay_matrix = get_mean_delays(mean_delay_exc, mean_delay_inh,
                                        len(populations))
    std_delay_matrix = get_std_delays(mean_delay_exc * rel_std_delay,
                                      mean_delay_inh * rel_std_delay,
                                      len(populations))
    PSP_mean_matrix = get_mean_PSP_matrix(PSP_e, g, len(populations))
    PSP_std_matrix = get_std_PSP_matrix(PSP_sd, len(populations))


def seed():
    return np.random.randint(1000, 10000)
    
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

    models = [(P.neuron_model, 'excitatory', P.neuron_params),
              (P.neuron_model, 'inhibitory', P.neuron_params)]

    syn_models = [('static_synapse', 'static_excitatory', {})]

    print("Generating positions...")

    N = 0
    for key, itm in P.populations.items():
        N += itm

    print("N = ", N)

    # Generate all the positions first to avoid overlapping.
    quasi_rand_pos = sl.i4_sobol_generate(3, N, seed())
    print("Number of points: {}".format(len(quasi_rand_pos[0])))

    N23E = P.populations['L23E']
    N23I = N23E + P.populations['L23I']
    N4E = N23I + P.populations['L4E']
    N4I = N4E + P.populations['L4I']
    N5E = N4I + P.populations['L5E']
    N5I = N5E + P.populations['L5I']
    N6E = N5I + P.populations['L6E']
    N6I = N6E + P.populations['L6I']
    quasi_rand_L23E = [quasi_rand_pos[0][:N23E],
                       quasi_rand_pos[1][:N23E],
                       quasi_rand_pos[2][:N23E]]
    quasi_rand_L23I = [quasi_rand_pos[0][N23E:N23I],
                       quasi_rand_pos[1][N23E:N23I],
                       quasi_rand_pos[2][N23E:N23I]]
    quasi_rand_L4E = [quasi_rand_pos[0][N23I:N4E],
                      quasi_rand_pos[1][N23I:N4E],
                      quasi_rand_pos[2][N23I:N4E]]
    quasi_rand_L4I = [quasi_rand_pos[0][N4E:N4I],
                      quasi_rand_pos[1][N4E:N4I],
                      quasi_rand_pos[2][N4E:N4I]]
    quasi_rand_L5E = [quasi_rand_pos[0][N4I:N5E],
                      quasi_rand_pos[1][N4I:N5E],
                      quasi_rand_pos[2][N4I:N5E]]
    quasi_rand_L5I = [quasi_rand_pos[0][N5E:N5I],
                      quasi_rand_pos[1][N5E:N5I],
                      quasi_rand_pos[2][N5E:N5I]]
    quasi_rand_L6E = [quasi_rand_pos[0][N5I:N6E],
                      quasi_rand_pos[1][N5I:N6E],
                      quasi_rand_pos[2][N5I:N6E]]
    quasi_rand_L6I = [quasi_rand_pos[0][N6E:N6I],
                      quasi_rand_pos[1][N6E:N6I],
                      quasi_rand_pos[2][N6E:N6I]]


    x_extent = 1.0
    #y_extent = 0.5
    z_extent = 1.0

    maxpop = max(P.populations['L23E'], P.populations['L23I'],
                 P.populations['L4E'], P.populations['L4I'],
                 P.populations['L5E'], P.populations['L5I'],
                 P.populations['L6E'], P.populations['L6I'])

    #-------------------------------------------------------------------------#
    #                               N23E                                      #
    #-------------------------------------------------------------------------#

    #dx = x_extent / float( P.populations['L23E'] )
    dx = x_extent / float( maxpop )
    L23E_x_start_pos = - ( ( x_extent - dx ) / 2.0 )
    L23E_x_end_pos = ( x_extent - dx ) / 2.0

    #dy = y_extent / float( P.populations['L23E'] )
    L23y_extent = 0.6
    L23_cntr = 0.75#0.95
    dy = L23y_extent / float( maxpop )
    L23E_y_start_pos = - ( ( L23y_extent - dy ) / 2.0 ) + L23_cntr
    L23E_y_end_pos = ( L23y_extent - dy ) / 2.0 + L23_cntr

    #dz = z_extent / float( P.populations['L23E'] )
    dz = z_extent / float( maxpop )
    L23E_z_start_pos = - ( ( z_extent - dz ) / 2.0 )
    L23E_z_end_pos = ( z_extent - dz ) / 2.0

    L23E_pos = [L23E_x_start_pos + quasi_rand_L23E[0] * (L23E_x_end_pos - L23E_x_start_pos),
                L23E_y_start_pos + quasi_rand_L23E[1] * (L23E_y_end_pos - L23E_y_start_pos),
                L23E_z_start_pos + quasi_rand_L23E[2] * (L23E_z_end_pos - L23E_z_start_pos)]
    
    L23E_positions = [[L23E_pos[0][i],
                       L23E_pos[1][i],
                       L23E_pos[2][i]] for i in range(P.populations['L23E'])]

    #-------------------------------------------------------------------------#
    #                               N23I                                      #
    #-------------------------------------------------------------------------#

    #dx = x_extent / float( P.populations['L23I'] )
    L23I_x_start_pos = - ( ( x_extent - dx ) / 2.0 )
    L23I_x_end_pos = ( x_extent - dx ) / 2.0

    #dy = y_extent / float( P.populations['L23I'] )
    L23I_y_start_pos = - ( ( L23y_extent - dy ) / 2.0 ) + L23_cntr
    L23I_y_end_pos = ( L23y_extent - dy ) / 2.0 + L23_cntr

    #dz = z_extent / float( P.populations['L23I'] )
    L23I_z_start_pos = - ( ( z_extent - dz ) / 2.0 )
    L23I_z_end_pos = ( z_extent - dz ) / 2.0

    L23I_pos = [L23I_x_start_pos + quasi_rand_L23I[0] * (L23I_x_end_pos - L23I_x_start_pos),
                L23I_y_start_pos + quasi_rand_L23I[1] * (L23I_y_end_pos - L23I_y_start_pos),
                L23I_z_start_pos + quasi_rand_L23I[2] * (L23I_z_end_pos - L23I_z_start_pos)]
    
    L23I_positions = [[L23I_pos[0][i],
                       L23I_pos[1][i],
                       L23I_pos[2][i]] for i in range(P.populations['L23I'])]

    #-------------------------------------------------------------------------#
    #                               N4E                                       #
    #-------------------------------------------------------------------------#

    #dx = x_extent / float( P.populations['L4E'] )
    L4E_x_start_pos = - ( ( x_extent - dx ) / 2.0 )
    L4E_x_end_pos = ( x_extent - dx ) / 2.0

    #dy = y_extent / float( P.populations['L4E'] )
    L4y_extent = 0.7
    L4_cntr = 0.1#0.3
    L4E_y_start_pos = - ( ( L4y_extent - dy ) / 2.0 ) + L4_cntr
    L4E_y_end_pos = ( L4y_extent - dy ) / 2.0 + L4_cntr

    #dz = z_extent / float( P.populations['L4E'] )
    L4E_z_start_pos = - ( ( z_extent - dz ) / 2.0 )
    L4E_z_end_pos = ( z_extent - dz ) / 2.0

    L4E_pos = [L4E_x_start_pos + quasi_rand_L4E[0] * (L4E_x_end_pos - L4E_x_start_pos),
               L4E_y_start_pos + quasi_rand_L4E[1] * (L4E_y_end_pos - L4E_y_start_pos),
               L4E_z_start_pos + quasi_rand_L4E[2] * (L4E_z_end_pos - L4E_z_start_pos)]
    
    L4E_positions = [[L4E_pos[0][i],
                      L4E_pos[1][i],
                      L4E_pos[2][i]] for i in range(P.populations['L4E'])]

    #-------------------------------------------------------------------------#
    #                               N4I                                       #
    #-------------------------------------------------------------------------#

    #dx = x_extent / float( P.populations['L4I'] )
    L4I_x_start_pos = - ( ( x_extent - dx ) / 2.0 )
    L4I_x_end_pos = ( x_extent - dx ) / 2.0

    #dy = y_extent / float( P.populations['L4I'] )
    L4I_y_start_pos = - ( ( L4y_extent - dy ) / 2.0 ) + L4_cntr
    L4I_y_end_pos = ( L4y_extent - dy ) / 2.0 + L4_cntr

    #dz = z_extent / float( P.populations['L4I'] )
    L4I_z_start_pos = - ( ( z_extent - dz ) / 2.0 )
    L4I_z_end_pos = ( z_extent - dz ) / 2.0

    L4I_pos = [L4I_x_start_pos + quasi_rand_L4I[0] * (L4I_x_end_pos - L4I_x_start_pos),
               L4I_y_start_pos + quasi_rand_L4I[1] * (L4I_y_end_pos - L4I_y_start_pos),
               L4I_z_start_pos + quasi_rand_L4I[2] * (L4I_z_end_pos - L4I_z_start_pos)]
    
    L4I_positions = [[L4I_pos[0][i],
                      L4I_pos[1][i],
                      L4I_pos[2][i]] for i in range(P.populations['L4I'])]

    #-------------------------------------------------------------------------#
    #                               N5E                                       #
    #-------------------------------------------------------------------------#

    #dx = x_extent / float( P.populations['L5E'] )
    L5E_x_start_pos = - ( ( x_extent - dx ) / 2.0 )
    L5E_x_end_pos = ( x_extent - dx ) / 2.0

    #dy = y_extent / float( P.populations['L5E'] )
    L5y_extent = 0.3
    L5_cntr = -0.4#-0.2
    L5E_y_start_pos = - ( ( L5y_extent - dy ) / 2.0 ) + L5_cntr
    L5E_y_end_pos = ( L5y_extent - dy ) / 2.0 + L5_cntr

    #dz = z_extent / float( P.populations['L5E'] )
    L5E_z_start_pos = - ( ( z_extent - dz ) / 2.0 )
    L5E_z_end_pos = ( z_extent - dz ) / 2.0

    L5E_pos = [L5E_x_start_pos + quasi_rand_L5E[0] * (L5E_x_end_pos - L5E_x_start_pos),
               L5E_y_start_pos + quasi_rand_L5E[1] * (L5E_y_end_pos - L5E_y_start_pos),
               L5E_z_start_pos + quasi_rand_L5E[2] * (L5E_z_end_pos - L5E_z_start_pos)]
    
    L5E_positions = [[L5E_pos[0][i],
                      L5E_pos[1][i],
                      L5E_pos[2][i]] for i in range(P.populations['L5E'])]

    #-------------------------------------------------------------------------#
    #                               N5I                                       #
    #-------------------------------------------------------------------------#

    #dx = x_extent / float( P.populations['L5I'] )
    L5I_x_start_pos = - ( ( x_extent - dx ) / 2.0 )
    L5I_x_end_pos = ( x_extent - dx ) / 2.0

    #dy = y_extent / float( P.populations['L5I'] )
    L5I_y_start_pos = - ( ( L5y_extent - dy ) / 2.0 ) + L5_cntr
    L5I_y_end_pos = ( L5y_extent - dy ) / 2.0 + L5_cntr

    #dz = z_extent / float( P.populations['L5I'] )
    L5I_z_start_pos = - ( ( z_extent - dz ) / 2.0 )
    L5I_z_end_pos = ( z_extent - dz ) / 2.0

    L5I_pos = [L5I_x_start_pos + quasi_rand_L5I[0] * (L5I_x_end_pos - L5I_x_start_pos),
               L5I_y_start_pos + quasi_rand_L5I[1] * (L5I_y_end_pos - L5I_y_start_pos),
               L5I_z_start_pos + quasi_rand_L5I[2] * (L5I_z_end_pos - L5I_z_start_pos)]
    
    L5I_positions = [[L5I_pos[0][i],
                      L5I_pos[1][i],
                      L5I_pos[2][i]] for i in range(P.populations['L5I'])]

    #-------------------------------------------------------------------------#
    #                               L6E                                       #
    #-------------------------------------------------------------------------#

    #dx = x_extent / float( P.populations['L6E'] )
    L6E_x_start_pos = - ( ( x_extent - dx ) / 2.0 )
    L6E_x_end_pos = ( x_extent - dx ) / 2.0

    #dy = y_extent / float( P.populations['L6E'] )
    L6y_extent = 0.4
    L6_cntr = -0.75#-0.55
    L6E_y_start_pos = - ( ( L6y_extent - dy ) / 2.0 ) + L6_cntr
    L6E_y_end_pos = ( L6y_extent - dy ) / 2.0 + L6_cntr

    #dz = z_extent / float( P.populations['L6E'] )
    L6E_z_start_pos = - ( ( z_extent - dz ) / 2.0 )
    L6E_z_end_pos = ( z_extent - dz ) / 2.0

    L6E_pos = [L6E_x_start_pos + quasi_rand_L6E[0] * (L6E_x_end_pos - L6E_x_start_pos),
               L6E_y_start_pos + quasi_rand_L6E[1] * (L6E_y_end_pos - L6E_y_start_pos),
               L6E_z_start_pos + quasi_rand_L6E[2] * (L6E_z_end_pos - L6E_z_start_pos)]
    
    L6E_positions = [[L6E_pos[0][i],
                      L6E_pos[1][i],
                      L6E_pos[2][i]] for i in range(P.populations['L6E'])]

    #-------------------------------------------------------------------------#
    #                               L6I                                       #
    #-------------------------------------------------------------------------#

    #dx = x_extent / float( P.populations['L6I'] )
    L6I_x_start_pos = - ( ( x_extent - dx ) / 2.0 )
    L6I_x_end_pos = ( x_extent - dx ) / 2.0

    #dy = y_extent / float( P.populations['L6I'] )
    L6I_y_start_pos = - ( ( L6y_extent - dy ) / 2.0 ) + L6_cntr
    L6I_y_end_pos = ( L6y_extent - dy ) / 2.0 + L6_cntr

    #dz = z_extent / float( P.populations['L6I'] )
    L6I_z_start_pos = - ( ( z_extent - dz ) / 2.0 )
    L6I_z_end_pos = ( z_extent - dz ) / 2.0

    L6I_pos = [L6I_x_start_pos + quasi_rand_L6I[0] * (L6I_x_end_pos - L6I_x_start_pos),
               L6I_y_start_pos + quasi_rand_L6I[1] * (L6I_y_end_pos - L6I_y_start_pos),
               L6I_z_start_pos + quasi_rand_L6I[2] * (L6I_z_end_pos - L6I_z_start_pos)]
    
    L6I_positions = [[L6I_pos[0][i],
                      L6I_pos[1][i],
                      L6I_pos[2][i]] for i in range(P.populations['L6I'])]


    print("Generating layers...")
    layers = [('L23E', {'positions': L23E_positions,
                        #'edge_wrap': True,
                        'center': [0.0, L23_cntr, 0.0],
                        'extent': [x_extent, L23y_extent, z_extent],
                        'neuronType': 'excitatory',
                        'elements': 'excitatory'}),
              ('L23I', {'positions': L23I_positions,
                        #'edge_wrap': True,
                        'center': [0.0, L23_cntr, 0.0],
                        'extent': [x_extent, L23y_extent, z_extent],
                        'neuronType': 'inhibitory',
                        'elements': 'inhibitory'}),
              ('L4E', {'positions': L4E_positions,
                       #'edge_wrap': True,
                       'center': [0.0, L4_cntr, 0.0],
                       'extent': [x_extent, L4y_extent, z_extent],
                       'neuronType': 'excitatory',
                       'elements': 'excitatory'}),
              ('L4I', {'positions': L4I_positions,
                       #'edge_wrap': True,
                       'center': [0.0, L4_cntr, 0.0],
                       'extent': [x_extent, L4y_extent, z_extent],
                       'neuronType': 'inhibitory',
                       'elements': 'inhibitory'}),
              ('L5E', {'positions': L5E_positions,
                       #'edge_wrap': True,
                       'center': [0.0, L5_cntr, 0.0],
                       'extent': [x_extent, L5y_extent, z_extent],
                       'neuronType': 'excitatory',
                       'elements': 'excitatory'}),
              ('L5I', {'positions': L5I_positions,
                       #'edge_wrap': True,
                       'center': [0.0, L5_cntr, 0.0],
                       'extent': [x_extent, L5y_extent, z_extent],
                       'neuronType': 'inhibitory',
                       'elements': 'inhibitory'}),
              ('L6E', {'positions': L6E_positions,
                       #'edge_wrap': True,
                       'center': [0.0, L6_cntr, 0.0],
                       'extent': [x_extent, L6y_extent, z_extent],
                       'neuronType': 'excitatory',
                       'elements': 'excitatory'}),
              ('L6I', {'positions': L6I_positions,
                       #'edge_wrap': True,
                       'center': [0.0, L6_cntr, 0.0],
                       'extent': [x_extent, L6y_extent, z_extent],
                       'neuronType': 'inhibitory',
                       'elements': 'inhibitory'})]

    return layers, models, syn_models


def make_connections():
    """
    Returns list of dictionaries specifying projections for Brunel network.
    """

    P = Parameters

    conn_probs = P.conn_probs

    K_scaling = P.K_scaling    # multiply with conn_probs??
    #synapses = get_total_number_of_synapses(self.net_dict)
    #synapses_scaled = synapses * K_scaling
    weight_mat = get_weight(P.PSP_mean_matrix, P)
    weight_mat_std = P.PSP_std_matrix

    sim_resolution = 1

    mean_delays = P.mean_delay_matrix
    std_delays = P.std_delay_matrix

    pops = ['L23E', 'L23I', 'L4E', 'L4I', 'L5E', 'L5I', 'L6E', 'L6I']

    projections = []

    for i, target_pop in enumerate(pops):
        for j, source_pop in enumerate(pops):
            weight = weight_mat[i][j]
            w_sd = abs(weight * weight_mat_std[i][j])
            conn_dict = {'connection_type': 'convergent',
                         'synapse_model': 'static_synapse',
                         'kernel': conn_probs[i][j],
                         'delays': {'normal':{'mean': mean_delays[i][j],
                                              'sigma': std_delays[i][j],
                                              'min': sim_resolution}},
                         'weights': {'normal': {'mean': weight,
                                                'sigma': w_sd}}
                        }
            if weight < 0:
                conn_dict['weights']['normal']['max'] = 0.0
            else:
                conn_dict['weights']['normal']['min'] = 0.0

            conn_list = (source_pop, target_pop, conn_dict)
            projections.append(conn_list)


    return projections


def presim_setup(nest_layers, **kwargs):
    """
    Function to call before simulating from App.
    May perform some setup.
    """
    
    pass
