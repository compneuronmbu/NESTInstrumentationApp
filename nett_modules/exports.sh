#!/bin/bash

# run with '. ./nett_modules/exports.sh'
# then add nest with 'export PYTHONPATH=$PYTHONPATH:path-to-pynest'
export PYTHONPATH=$PWD/nett_modules/python_modules/nett-python:$PWD/nett_modules/python_modules/protobuf
export LD_LIBRARY_PATH=$PWD/nett_modules/lib/boost/threading-multi