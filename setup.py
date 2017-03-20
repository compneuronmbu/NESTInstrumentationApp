# -*- coding: utf-8 -*-
from distutils.core import setup

setup(name='NESTConnectionApp',
      version='0.1',
      description='NESTConnectionApp is a tool to create connections by' +
                  'selecting in plots of nodes.',
      author='Stine Vennemo, Håkon Mørk and Hans Ekkehard Plesser',
      author_email='hans.ekkehard.plesser@nmbu.no',
      url='http://www.nest-simulator.org',
      packages=['NESTConnectionApp', 'NESTConnectionApp.GUI',
                'NESTConnectionApp.tests'],
      package_dir={'NESTConnectionApp': ''},
      package_data={'NESTConnectionApp': ['GUI/Qt_App_GUI.ui']}
      )
