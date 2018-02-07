from __future__ import print_function
import os
import json
import h5py
import numpy as np
import scipy.optimize as spo
import matplotlib.pyplot as plt

N_CHANNELS = 16

# Open file with LFP kernel data
f = h5py.File('kernels.h5', 'r')

# Layer names
l_names = [u'L23E', u'L23I', u'L4E', u'L4I', u'L5E', u'L5I', u'L6E', u'L6I']


def func_u(x, a, b, n):
    f = n * (np.exp(-a * x) - np.exp(-b * x)) / (b - a)
    sign_zero = np.sign(f[0])
    zero = np.argwhere(np.sign(f) != sign_zero)
    assert(np.isscalar(zero[0][0]))
    f[0:zero[0][0]] = 0
    return f


def func_pos(x, a, b, n):
    f = n * (np.exp(-a * x) - np.exp(-b * x)) / (b - a)
    return np.clip(f, 0, None)


def func_neg(x, a, b, n):
    f = n * (np.exp(-a * x) - np.exp(-b * x)) / (b - a)
    return np.clip(f, None, 0)


def fit_to_channel_data(ch):
        global fitted_variables
        fitted_variables[ch] = {}
        print('  Fitting..')
        for xax, from_l in enumerate(l_names):
            fitted_variables[ch][from_l] = {}
            for yax, to_l in enumerate(f[from_l].keys()):
                data = f[from_l][to_l][ch]
                func = (func_neg if np.max(np.abs(data)) > np.max(data)
                        else func_pos)
                popt, pcov = spo.curve_fit(func, range(-20, 21), data,
                                           p0=[0.5, 1.0, 1.0], method='trf')
                a, b, deta0 = popt
                fitted_variables[ch][from_l][to_l] = {
                    'deta0': deta0, 'a': a, 'b': b}


def plot_pre_post_kernels(ch):
        global fitted_variables
        print('  Plotting..')
        x = np.linspace(-20, 20, 100)
        fig, axarr = plt.subplots(8, 8, figsize=(50, 50))
        for xax, from_l in enumerate(l_names):
            for yax, to_l in enumerate(f[from_l].keys()):
                data = f[from_l][to_l][ch]
                a, b, deta0 = (fitted_variables[ch][from_l][to_l]['a'],
                               fitted_variables[ch][from_l][to_l]['b'],
                               fitted_variables[ch][from_l][to_l]['deta0'])
                axarr[xax, yax].set_title('{} => {}'.format(from_l, to_l))
                axarr[xax, yax].plot(range(-20, 21), data, ':k')
                axarr[xax, yax].plot(x, func_u(x, a, b, deta0), 'r')
        print('  Saving figure...')
        plt.savefig('figures/lfp_fit_{}.pdf'.format(ch + 1))


def plot_channel_pre_kernels():
    print('Making LFP response plot..')
    fig, axarr = plt.subplots(N_CHANNELS, 4, figsize=(30, 120))
    for ch in range(N_CHANNELS):
        print('Channel {}'.format(ch))
        layernames = (('L23E', 'L23I'),
                      ('L4E', 'L4I'),
                      ('L5E', 'L5I'),
                      ('L6E', 'L6I'))
        for i, layers in enumerate(layernames):
            x = np.linspace(-20, 20, 100)
            data_x = np.linspace(-20, 20, 41)
            fv_e = np.zeros(len(x))
            fv_i = np.zeros(len(x))
            v_e = np.zeros(len(data_x))
            v_i = np.zeros(len(data_x))
            for pre, fitted_values, d_values in zip(layers, (fv_e, fv_i),
                                                    (v_e, v_i)):
                for post in fitted_variables[ch][pre].keys():
                    data = f[pre][post][ch]
                    a, b, deta0 = (fitted_variables[ch][pre][post]['a'],
                                   fitted_variables[ch][pre][post]['b'],
                                   fitted_variables[ch][pre][post]['deta0'])
                    fitted_values += func_u(x, a, b, deta0)
                    d_values += data

            axarr[ch, i].set_title('{}: {}/{}'.format(ch + 1, *layers))
            axarr[ch, i].plot(data_x, v_i, ':b')
            axarr[ch, i].plot(data_x, v_e, ':r')
            axarr[ch, i].plot(x, fv_i, 'b')
            axarr[ch, i].plot(x, fv_e, 'r')
            axarr[ch, i].set_ylim(-0.004, 0.004)
    print('Saving figure...')
    plt.savefig('figures/LFP_response.pdf')


if __name__ == '__main__':
    if not os.path.exists('figures'):
        print('Directory figures/ not found, creating it..')
        os.makedirs('figures')
    fitted_variables = {}
    for ch in range(N_CHANNELS):
        print('Channel {}'.format(ch))
        fit_to_channel_data(ch)
        plot_pre_post_kernels(ch)
    plot_channel_pre_kernels()

    with open('fitted_values.json', 'w') as datafile:
        json.dump(fitted_variables, datafile,
                  sort_keys=True,
                  indent=4,
                  separators=(',', ': '))
