import define_brunel_3D
import toJSON
import pprint

layer_specs = define_brunel_3D.make_layers()
conn_specs = define_brunel_3D.make_connections()

print("##############################")
pprint.pprint(layer_specs)
print("##############################")
pprint.pprint(conn_specs)
print("##############################")
toJSON.convert(layer_specs, conn_specs, 'brunel_3D_converted')