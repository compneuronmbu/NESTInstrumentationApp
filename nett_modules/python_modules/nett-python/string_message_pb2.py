# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: string_message.proto

import sys
_b=sys.version_info[0]<3 and (lambda x:x) or (lambda x:x.encode('latin1'))
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection
from google.protobuf import symbol_database as _symbol_database
from google.protobuf import descriptor_pb2
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor.FileDescriptor(
  name='string_message.proto',
  package='',
  syntax='proto3',
  serialized_pb=_b('\n\x14string_message.proto\"\x1f\n\x0estring_message\x12\r\n\x05value\x18\x01 \x01(\tb\x06proto3')
)
_sym_db.RegisterFileDescriptor(DESCRIPTOR)




_STRING_MESSAGE = _descriptor.Descriptor(
  name='string_message',
  full_name='string_message',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='value', full_name='string_message.value', index=0,
      number=1, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=24,
  serialized_end=55,
)

DESCRIPTOR.message_types_by_name['string_message'] = _STRING_MESSAGE

string_message = _reflection.GeneratedProtocolMessageType('string_message', (_message.Message,), dict(
  DESCRIPTOR = _STRING_MESSAGE,
  __module__ = 'string_message_pb2'
  # @@protoc_insertion_point(class_scope:string_message)
  ))
_sym_db.RegisterMessage(string_message)


# @@protoc_insertion_point(module_scope)