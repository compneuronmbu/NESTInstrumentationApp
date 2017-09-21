import nest_utils as nu
import json

nett_spec = {"syn_models": [["static_synapse", "static_excitatory", {}]], "models": {"excitatory": "iaf_psc_alpha"}, "layers": [{"neurons": [{"x": -2.0, "y": -2.0, "z": -2.0}, {"x": -2.0, "y": -2.0, "z": -1.0}, {"x": -2.0, "y": -2.0, "z": 0.0}, {"x": -2.0, "y": -2.0, "z": 1.0}, {"x": -2.0, "y": -2.0, "z": 2.0}, {"x": -2.0, "y": -1.0, "z": -2.0}, {"x": -2.0, "y": -1.0, "z": -1.0}, {"x": -2.0, "y": -1.0, "z": 0.0}, {"x": -2.0, "y": -1.0, "z": 1.0}, {"x": -2.0, "y": -1.0, "z": 2.0}, {"x": -2.0, "y": 0.0, "z": -2.0}, {"x": -2.0, "y": 0.0, "z": -1.0}, {"x": -2.0, "y": 0.0, "z": 0.0}, {"x": -2.0, "y": 0.0, "z": 1.0}, {"x": -2.0, "y": 0.0, "z": 2.0}, {"x": -2.0, "y": 1.0, "z": -2.0}, {"x": -2.0, "y": 1.0, "z": -1.0}, {"x": -2.0, "y": 1.0, "z": 0.0}, {"x": -2.0, "y": 1.0, "z": 1.0}, {"x": -2.0, "y": 1.0, "z": 2.0}, {"x": -2.0, "y": 2.0, "z": -2.0}, {"x": -2.0, "y": 2.0, "z": -1.0}, {"x": -2.0, "y": 2.0, "z": 0.0}, {"x": -2.0, "y": 2.0, "z": 1.0}, {"x": -2.0, "y": 2.0, "z": 2.0}, {"x": -1.0, "y": -2.0, "z": -2.0}, {"x": -1.0, "y": -2.0, "z": -1.0}, {"x": -1.0, "y": -2.0, "z": 0.0}, {"x": -1.0, "y": -2.0, "z": 1.0}, {"x": -1.0, "y": -2.0, "z": 2.0}, {"x": -1.0, "y": -1.0, "z": -2.0}, {"x": -1.0, "y": -1.0, "z": -1.0}, {"x": -1.0, "y": -1.0, "z": 0.0}, {"x": -1.0, "y": -1.0, "z": 1.0}, {"x": -1.0, "y": -1.0, "z": 2.0}, {"x": -1.0, "y": 0.0, "z": -2.0}, {"x": -1.0, "y": 0.0, "z": -1.0}, {"x": -1.0, "y": 0.0, "z": 0.0}, {"x": -1.0, "y": 0.0, "z": 1.0}, {"x": -1.0, "y": 0.0, "z": 2.0}, {"x": -1.0, "y": 1.0, "z": -2.0}, {"x": -1.0, "y": 1.0, "z": -1.0}, {"x": -1.0, "y": 1.0, "z": 0.0}, {"x": -1.0, "y": 1.0, "z": 1.0}, {"x": -1.0, "y": 1.0, "z": 2.0}, {"x": -1.0, "y": 2.0, "z": -2.0}, {"x": -1.0, "y": 2.0, "z": -1.0}, {"x": -1.0, "y": 2.0, "z": 0.0}, {"x": -1.0, "y": 2.0, "z": 1.0}, {"x": -1.0, "y": 2.0, "z": 2.0}, {"x": 0.0, "y": -2.0, "z": -2.0}, {"x": 0.0, "y": -2.0, "z": -1.0}, {"x": 0.0, "y": -2.0, "z": 0.0}, {"x": 0.0, "y": -2.0, "z": 1.0}, {"x": 0.0, "y": -2.0, "z": 2.0}, {"x": 0.0, "y": -1.0, "z": -2.0}, {"x": 0.0, "y": -1.0, "z": -1.0}, {"x": 0.0, "y": -1.0, "z": 0.0}, {"x": 0.0, "y": -1.0, "z": 1.0}, {"x": 0.0, "y": -1.0, "z": 2.0}, {"x": 0.0, "y": 0.0, "z": -2.0}, {"x": 0.0, "y": 0.0, "z": -1.0}, {"x": 0.0, "y": 0.0, "z": 0.0}, {"x": 0.0, "y": 0.0, "z": 1.0}, {"x": 0.0, "y": 0.0, "z": 2.0}, {"x": 0.0, "y": 1.0, "z": -2.0}, {"x": 0.0, "y": 1.0, "z": -1.0}, {"x": 0.0, "y": 1.0, "z": 0.0}, {"x": 0.0, "y": 1.0, "z": 1.0}, {"x": 0.0, "y": 1.0, "z": 2.0}, {"x": 0.0, "y": 2.0, "z": -2.0}, {"x": 0.0, "y": 2.0, "z": -1.0}, {"x": 0.0, "y": 2.0, "z": 0.0}, {"x": 0.0, "y": 2.0, "z": 1.0}, {"x": 0.0, "y": 2.0, "z": 2.0}, {"x": 1.0, "y": -2.0, "z": -2.0}, {"x": 1.0, "y": -2.0, "z": -1.0}, {"x": 1.0, "y": -2.0, "z": 0.0}, {"x": 1.0, "y": -2.0, "z": 1.0}, {"x": 1.0, "y": -2.0, "z": 2.0}, {"x": 1.0, "y": -1.0, "z": -2.0}, {"x": 1.0, "y": -1.0, "z": -1.0}, {"x": 1.0, "y": -1.0, "z": 0.0}, {"x": 1.0, "y": -1.0, "z": 1.0}, {"x": 1.0, "y": -1.0, "z": 2.0}, {"x": 1.0, "y": 0.0, "z": -2.0}, {"x": 1.0, "y": 0.0, "z": -1.0}, {"x": 1.0, "y": 0.0, "z": 0.0}, {"x": 1.0, "y": 0.0, "z": 1.0}, {"x": 1.0, "y": 0.0, "z": 2.0}, {"x": 1.0, "y": 1.0, "z": -2.0}, {"x": 1.0, "y": 1.0, "z": -1.0}, {"x": 1.0, "y": 1.0, "z": 0.0}, {"x": 1.0, "y": 1.0, "z": 1.0}, {"x": 1.0, "y": 1.0, "z": 2.0}, {"x": 1.0, "y": 2.0, "z": -2.0}, {"x": 1.0, "y": 2.0, "z": -1.0}, {"x": 1.0, "y": 2.0, "z": 0.0}, {"x": 1.0, "y": 2.0, "z": 1.0}, {"x": 1.0, "y": 2.0, "z": 2.0}, {"x": 2.0, "y": -2.0, "z": -2.0}, {"x": 2.0, "y": -2.0, "z": -1.0}, {"x": 2.0, "y": -2.0, "z": 0.0}, {"x": 2.0, "y": -2.0, "z": 1.0}, {"x": 2.0, "y": -2.0, "z": 2.0}, {"x": 2.0, "y": -1.0, "z": -2.0}, {"x": 2.0, "y": -1.0, "z": -1.0}, {"x": 2.0, "y": -1.0, "z": 0.0}, {"x": 2.0, "y": -1.0, "z": 1.0}, {"x": 2.0, "y": -1.0, "z": 2.0}, {"x": 2.0, "y": 0.0, "z": -2.0}, {"x": 2.0, "y": 0.0, "z": -1.0}, {"x": 2.0, "y": 0.0, "z": 0.0}, {"x": 2.0, "y": 0.0, "z": 1.0}, {"x": 2.0, "y": 0.0, "z": 2.0}, {"x": 2.0, "y": 1.0, "z": -2.0}, {"x": 2.0, "y": 1.0, "z": -1.0}, {"x": 2.0, "y": 1.0, "z": 0.0}, {"x": 2.0, "y": 1.0, "z": 1.0}, {"x": 2.0, "y": 1.0, "z": 2.0}, {"x": 2.0, "y": 2.0, "z": -2.0}, {"x": 2.0, "y": 2.0, "z": -1.0}, {"x": 2.0, "y": 2.0, "z": 0.0}, {"x": 2.0, "y": 2.0, "z": 1.0}, {"x": 2.0, "y": 2.0, "z": 2.0}], "elements": "excitatory", "center": [0.0, 0.0, 0.0], "extent": [5.0, 5.0, 5.0], "name": "exAndIn", "neuronType": ""}], "projections": [["exAndIn", "exAndIn", {"synapse_model": "static_synapse", "kernel": 0.1, "delays": 1.5, "connection_type": "convergent", "weights": 0.1}]], "is3DLayer": True}

nett_spec_json = json.dumps(nett_spec)

ni = nu.NESTInterface(nett_spec_json)
