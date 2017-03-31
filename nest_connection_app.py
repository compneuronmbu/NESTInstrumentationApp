#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# nest_connection_app.py
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
NEST Connection App

This is the stand-alone version of the NEST Connection App
with Qt5-based GUI.
"""

import os
import fnmatch
import imp
import argparse
import textwrap
from NESTConnectionApp.selector import PointsSelector

# Argument parser
parser = argparse.ArgumentParser(
    formatter_class=argparse.RawTextHelpFormatter,
    description=textwrap.dedent('''\
        Run the App with the selected model.'''),
    epilog=textwrap.dedent('''\
        Examples:
          python nest_connection_app.py examples/define_hill_tononi.py
          nest_connection_app.py examples/define_brunel.py'''))
parser.add_argument("MODEL", type=str,
                    help="Model definition file to use.")
parser.add_argument("-l", "--layers", type=int,
                    help="Number of layers to plot (default is all)",
                    metavar="N")
parser.add_argument("-s", "--nodesize", type=int,
                    help="Size of nodes in the plot (default is S=20)",
                    metavar="S")
args = parser.parse_args()

if not args.MODEL.endswith('.py'):
    raise RuntimeError('Model argument must be Python source file!')

# import module defining model from arbitrary Python file
try:
    os.remove(args.MODEL + 'c')  # remove pyc file if it exists
except:
    pass
model_definition = imp.load_source('model_definition', args.MODEL)

# obtain layer an connection specifications
layers, models, syn_models = model_definition.make_layers()
connections = model_definition.make_connections()
models += syn_models

num_layers = len(layers) if args.layers is None else min(args.layers, len(layers))
nodesize = 20 if args.nodesize is None else args.nodesize

PointsSelector(layers[:num_layers],
               models=models,
               syn_models=syn_models,
               connections=connections,
               nodesize=nodesize
               ).run()
