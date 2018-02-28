from __future__ import print_function
import os
import json
import sys
import h5py
import numpy as np
import scipy.optimize as spo
import matplotlib.pyplot as plt

N_CHANNELS = 16

# Open file with LFP kernel data
f = h5py.File('kernels.h5', 'r')

# Layer names
l_names = [u'L23E', u'L23I', u'L4E', u'L4I', u'L5E', u'L5I', u'L6E', u'L6I']


def func_single(x, a, b, n):
    if a == b:
        return np.zeros(len(x))
    f = n * (np.exp(-a * x) - np.exp(-b * x)) / (b - a)
    zero = int((len(x) - 1) / 2.) + 1
    f[0:zero] = 0
    return f


def func_double(x, a, b, n, a2, b2, n2):
    if a == b:
        return np.zeros(len(x))
    f = (n * (np.exp(-a * x) - np.exp(-b * x)) / (b - a) +
         n2 * (np.exp(-a2 * x) - np.exp(-b2 * x)) / (b2 - a2))
    zero = int((len(x) - 1) / 2.) + 1
    f[0:zero] = 0
    return f


def fit_to_channel_data(ch):
        global fitted_variables
        # error = np.zeros(6)
        fitted_variables[ch] = {}
        print('  Fitting..')
        for xax, from_l in enumerate(l_names):
            fitted_variables[ch][from_l] = {}
            for yax, to_l in enumerate(f[from_l].keys()):
                data = f[from_l][to_l][ch]
                a = 0.5
                b = 1.0
                deta0 = 0
                a2 = 0.5
                b2 = 1.0
                deta02 = 0
                if np.max(np.abs(data)) > 1e-8:
                    data_pad = np.pad(data, 10, 'constant', constant_values=0)
                    max_d = np.max(data)
                    amin_d = np.abs(np.min(data))
                    rel = 7
                    if np.max(np.abs(data)) > np.max(data):
                        double = True if rel * max_d > amin_d else False
                    else:
                        double = True if rel * amin_d > max_d else False

                    # if rel * amin_d > max_d or rel * max_d > amin_d:
                    if double:
                        popt, pcov = spo.curve_fit(func_double, range(-30, 31),
                                                   data_pad,
                                                   p0=[0.1, 0.5, 0.1,
                                                       0.1, 0.5, 0.1],
                                                   method='trf')
                        a, b, deta0, a2, b2, deta02 = popt

                    else:
                        popt, pcov = spo.curve_fit(func_single, range(-30, 31),
                                                   data_pad,
                                                   p0=[0.1, 0.5, 0.1],
                                                   method='trf')
                        a, b, deta0 = popt
                    # error += np.sqrt(np.diag(pcov))
                fitted_variables[ch][from_l][to_l] = {
                    'deta0': deta0, 'a': a, 'b': b,
                    'deta02': deta02, 'a2': a2, 'b2': b2}
        # return error


def plot_pre_post_kernels(ch):
        global fitted_variables
        print('  Plotting..')
        # max_val = np.max(np.abs(np.array([f[pre][post][c] for c in range(16)
        #                                   for pre in l_names
        #                                   for post in l_names])))
        x = np.linspace(-20, 20, 100)
        x01 = np.array(range(-20, 21))
        fig, axarr = plt.subplots(8, 8, figsize=(50, 50))
        err_fig, err_axarr = plt.subplots(8, 8, figsize=(50, 50))
        for xax, from_l in enumerate(l_names):
            for yax, to_l in enumerate(f[from_l].keys()):
                data = f[from_l][to_l][ch]
                a, b, deta0, a2, b2, deta02 = (
                    fitted_variables[ch][from_l][to_l]['a'],
                    fitted_variables[ch][from_l][to_l]['b'],
                    fitted_variables[ch][from_l][to_l]['deta0'],
                    fitted_variables[ch][from_l][to_l]['a2'],
                    fitted_variables[ch][from_l][to_l]['b2'],
                    fitted_variables[ch][from_l][to_l]['deta02'])
                axarr[xax, yax].set_title('{} => {}'.format(from_l, to_l))
                axarr[xax, yax].set_xlabel('[{:.1e} {:.1e} {:.1e} {:.1e} {:.1e} {:.1e}]'.format(a, b, deta0, a2, b2, deta02))
                axarr[xax, yax].plot(x01, data, '0.5')
                axarr[xax, yax].plot(x, func_double(x, a, b, deta0,
                                                    a2, b2, deta02), 'r')
                axarr[xax, yax].set_title('{} => {}'.format(from_l, to_l))
                error = (data - func_double(x01, a, b, deta0, a2, b2, deta02))
                axarr[xax, yax].plot(x01, error, ':b')
                # axarr[xax, yax].set_ylim(-max_val, max_val)
        print('  Saving figure...')
        fig.savefig('figures/double_lfp_fit_{}.pdf'.format(ch + 1))
        # err_fig.savefig('figures/double_error_lfp_fit_{}.pdf'.format(ch + 1))


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
                    a, b, deta0, a2, b2, deta02 = (
                        fitted_variables[ch][pre][post]['a'],
                        fitted_variables[ch][pre][post]['b'],
                        fitted_variables[ch][pre][post]['deta0'],
                        fitted_variables[ch][pre][post]['a2'],
                        fitted_variables[ch][pre][post]['b2'],
                        fitted_variables[ch][pre][post]['deta02'])
                    fitted_values += func_double(x, a, b, deta0,
                                                 a2, b2, deta02)
                    d_values += data

            axarr[ch, i].set_title('{}: {}/{}'.format(ch + 1, *layers))
            axarr[ch, i].plot(data_x, v_i, ':b')
            axarr[ch, i].plot(data_x, v_e, ':r')
            axarr[ch, i].plot(x, fv_i, 'b')
            axarr[ch, i].plot(x, fv_e, 'r')
            axarr[ch, i].set_ylim(-0.004, 0.004)
    print('Saving figure...')
    plt.savefig('figures/double_LFP_response.pdf')


if __name__ == '__main__':
    if not os.path.exists('figures'):
        print('Directory figures/ not found, creating it..')
        os.makedirs('figures')
    fitted_variables = {}
    channel_errors = np.zeros([N_CHANNELS, 6])
    for ch in range(N_CHANNELS):
        print('Channel {}'.format(ch))
        fit_to_channel_data(ch)
        # channel_errors[ch] = fit_to_channel_data(ch)
        plot_pre_post_kernels(ch)
    # plot_channel_pre_kernels()

    # for ch in range(len(channel_errors[:, 0])):
    #     print('ch {}: {}'.format(ch, channel_errors[ch]))
    # v = ['a', 'b', 'deta0']
    # for var in range(len(channel_errors[0])):
    #     plt.figure()
    #     plt.plot(channel_errors[:, var])
    #     plt.title('{} std error'.format(v[var]))
    # print(np.sum(channel_errors, axis=0))
    # # plt.show()

    with open('double_fitted_values.json', 'w') as datafile:
        json.dump(fitted_variables, datafile,
                  sort_keys=True,
                  indent=4,
                  separators=(',', ': '))
