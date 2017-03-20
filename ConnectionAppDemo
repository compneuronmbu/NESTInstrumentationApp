#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
This example shows how to use the NEST Connection App with the PyQt5 interface.
"""
import os
import fnmatch
import importlib
import argparse
import textwrap
from NESTConnectionApp.selector import PointsSelector


directory_path = os.path.dirname(os.path.realpath(__file__)) + '/examples'
model_files = [f for f in os.listdir(directory_path) if fnmatch.fnmatch(
    f, 'define_*.py')]

# Argument parser
parser = argparse.ArgumentParser(
    formatter_class=argparse.RawTextHelpFormatter,
    description=textwrap.dedent('''\
        Run the App with the selected model.'''),
    epilog=textwrap.dedent('''\
        Examples:
          python ConnectionAppDemo.py define_hill_tononi.py
          python ConnectionAppDemo.py define_brunel.py'''))
parser.add_argument("MODEL", choices=model_files,
                    help="Model definition file to use.")
parser.add_argument("-l", "--layers", type=int,
                    help="Number of layers to plot (default is all)",
                    metavar="N")
parser.add_argument("-s", "--nodesize", type=int,
                    help="Size of nodes in the plot (default is S=20)",
                    metavar="S")
args = parser.parse_args()


mod_path = 'examples.' + os.path.splitext(args.MODEL)[0]
model_definitions = importlib.import_module(mod_path)

layers, models, syn_models = model_definitions.make_layers()

connections = model_definitions.make_connections()

no_layers = len(layers) if args.layers is None else args.layers
nodesize = 20 if args.nodesize is None else args.nodesize

models += syn_models

PointsSelector(layers[:no_layers], models=models, syn_models=syn_models, connections=connections, nodesize=nodesize).run()
