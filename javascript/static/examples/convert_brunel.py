from NESTConnectionApp.examples import define_brunel
import toJSON


specs = define_brunel.make_layers()
toJSON.convert(specs)
