import define_Potjans_Diesmann
import toJSON
import pprint

layer_specs = define_Potjans_Diesmann.make_layers()
conn_specs = define_Potjans_Diesmann.make_connections()

print("##############################")
#pprint.pprint(layer_specs)
print("##############################")
#pprint.pprint(conn_specs)
print("##############################")
toJSON.convert(layer_specs, conn_specs, 'Potjans_Diesmann_converted')