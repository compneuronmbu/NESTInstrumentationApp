# -*- coding: utf-8 -*-
#
# setup.py
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

from distutils.core import setup

setup(name='NESTConnectionApp',
      version='0.1',
      description='NESTConnectionApp is a tool to create connections by' +
                  'selecting in plots of nodes.',
      author='Stine Vennemo, Håkon Mørk and Hans Ekkehard Plesser',
      author_email='hans.ekkehard.plesser@nmbu.no',
      url='https://github.com/compneuronmbu/NESTConnectionApp',
      license='GPL v2 or later',
      packages=['NESTConnectionApp', 'NESTConnectionApp.GUI',
                'NESTConnectionApp.examples',
                'NESTConnectionApp.tests'],
      package_dir={'NESTConnectionApp': ''},
      package_data={'NESTConnectionApp': ['GUI/Qt_App_GUI.ui']}
      )
