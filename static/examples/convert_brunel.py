import define_brunel
import toJSON
import pprint

layer_specs = define_brunel.make_layers()
conn_specs = define_brunel.make_connections()

print("##############################")
pprint.pprint(layer_specs)
print("##############################")
pprint.pprint(conn_specs)
print("##############################")
toJSON.convert(layer_specs, conn_specs, 'brunel_converted')
