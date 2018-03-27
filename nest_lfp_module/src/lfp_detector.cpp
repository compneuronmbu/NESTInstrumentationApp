/*
 *  lfp_detector.cpp
 *
 *  This file is part of NEST.
 *
 *  Copyright (C) 2004 The NEST Initiative
 *
 *  NEST is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  NEST is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with NEST.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

#include "lfp_detector.h"

// Includes from libnestutil:
#include "numerics.h"

// Includes from nestkernel:
#include "exceptions.h"
#include "kernel_manager.h"
#include "universal_data_logger_impl.h"

/* ----------------------------------------------------------------
 * Recordables map
 * ---------------------------------------------------------------- */

nest::RecordablesMap< mynest::lfp_detector >
  mynest::lfp_detector::recordablesMap_;

namespace nest // template specialization must be placed in namespace
{
// Override the create() method with one call to RecordablesMap::insert_()
// for each quantity to be recorded.
template <>
void
RecordablesMap< mynest::lfp_detector >::create()
{
  // use standard names wherever you can for consistency!
  insert_( Name( "lfp" ),
    &mynest::lfp_detector::get_y_elem_< mynest::lfp_detector::State_::G > );
}
}

/* ----------------------------------------------------------------
 * Default constructors defining default parameters and state
 * ---------------------------------------------------------------- */

mynest::lfp_detector::Parameters_::Parameters_()
  : tau_rise( 1, 2.0468 )        // ms
  , tau_decay( 1, 2.0456 )       // ms
  , tau_rise2( 1, 2.0468 )       // ms
  , tau_decay2( 1, 2.0456 )      // ms
  , normalizer( 1, 1.58075e-04 ) // mV / ms
  , normalizer2( 1, 0.0 )        // mV / ms
{
}

mynest::lfp_detector::State_::State_( const Parameters_& p )
  : y_( STATE_VECTOR_MIN_SIZE, 0.0 )
  , y2_( STATE_VECTOR_MIN_SIZE, 0.0 )
{
}

mynest::lfp_detector::State_::State_( const State_& s )
{
  y_ = s.y_;
  y2_ = s.y2_;
}

mynest::lfp_detector::State_& mynest::lfp_detector::State_::operator=(
  const State_& s )
{
  assert( this != &s ); // would be bad logical error in program

  y_ = s.y_;
  y2_ = s.y2_;
  return *this;
}

/* ----------------------------------------------------------------
 * Parameter and state extractions and manipulation functions
 * ---------------------------------------------------------------- */

void
mynest::lfp_detector::Parameters_::get( DictionaryDatum& d ) const
{
  ArrayDatum tau_rise_ad( tau_rise );
  ArrayDatum tau_decay_ad( tau_decay );
  ArrayDatum normalizer_ad( normalizer );
  ArrayDatum tau_rise2_ad( tau_rise2 );
  ArrayDatum tau_decay2_ad( tau_decay2 );
  ArrayDatum normalizer2_ad( normalizer2 );
  ArrayDatum borders_ad( borders );
  def< size_t >( d, Name( "n_receptors" ), n_receptors() );
  def< ArrayDatum >( d, Name( "tau_rise" ), tau_rise_ad );
  def< ArrayDatum >( d, Name( "tau_decay" ), tau_decay_ad );
  def< ArrayDatum >( d, Name( "normalizer" ), normalizer_ad );
  def< ArrayDatum >( d, Name( "tau_rise2" ), tau_rise2_ad );
  def< ArrayDatum >( d, Name( "tau_decay2" ), tau_decay2_ad );
  def< ArrayDatum >( d, Name( "normalizer2" ), normalizer2_ad );
  def< ArrayDatum >( d, Name( "borders" ), borders_ad );
}

void
mynest::lfp_detector::Parameters_::set( const DictionaryDatum& d )
{
  const size_t old_n_receptors = n_receptors();

  bool taur_flag =
    updateValue< std::vector< double > >( d, Name( "tau_rise" ), tau_rise );
  bool taud_flag =
    updateValue< std::vector< double > >( d, Name( "tau_decay" ), tau_decay );
  bool tau2r_flag =
    updateValue< std::vector< double > >( d, Name( "tau_rise2" ), tau_rise2 );
  bool tau2d_flag =
    updateValue< std::vector< double > >( d, Name( "tau_decay2" ), tau_decay2 );

  if ( tau_rise.size() != tau_decay.size() )
  {
    throw nest::BadProperty(
      "Tau coefficient arrays must have the same length." );
  }

  if ( tau_rise2.size() != 1 and ( tau_rise.size() != tau_rise2.size()
                                   or tau_rise.size() != tau_decay2.size() ) )
  {
    throw nest::BadProperty(
      "Tau coefficient arrays must have the same length." );
  }

  if ( taur_flag or taud_flag or tau2r_flag or tau2d_flag )
  { // receptor arrays have been modified
    if ( ( tau_rise.size() != old_n_receptors // TODO: needed?
           or tau_decay.size() != old_n_receptors
           or tau_rise2.size() != old_n_receptors
           or tau_decay2.size() != old_n_receptors )
      && ( not taur_flag or not taud_flag ) )
    {
      throw nest::BadProperty(
        "If the number of receptor ports is changed, the two arrays "
        "tau_rise and tau_decay must be provided." );
    }
    for ( size_t i = 0; i < tau_rise.size(); ++i )
    {
      if ( tau_rise[ i ] == 0 or tau_decay[ i ] == 0 )
      {
        throw nest::BadProperty( "Tau constants cannot be zero." );
      }
      if ( tau_rise[ i ] == tau_decay[ i ] )
      {
        throw nest::BadProperty(
          "The i-th element in tau_rise/tau_rise2 cannot be equal to the i-th "
          "element in tau_decay/tau_decay2." );
      }
      if ( tau_rise2.size() != 1
        and ( tau_rise2[ i ] == 0 or tau_decay2[ i ] == 0 ) )
      {
        throw nest::BadProperty( "Tau constants cannot be zero." );
      }
      if ( tau_rise2.size() != 1 and tau_rise2[ i ] == tau_decay2[ i ] )
      {
        throw nest::BadProperty(
          "The i-th element in tau_rise/tau_rise2 cannot be equal to the i-th "
          "element in tau_decay/tau_decay2." );
      }
    }
  }

  updateValue< std::vector< double > >( d, Name( "normalizer" ), normalizer );
  if ( normalizer.size() != tau_rise.size() )
  {
    throw nest::BadProperty(
      "normalizer array must have same length as the tau arrays." );
  }

  bool normalizer2_flag = updateValue< std::vector< double > >(
    d, Name( "normalizer2" ), normalizer2 );
  if ( normalizer2_flag and normalizer2.size() != tau_rise2.size() )
  {
    throw nest::BadProperty(
      "normalizer2 array must have same length as the tau arrays." );
  }
  if ( not normalizer2_flag )
  {
    // If we do not send in normalizer2 vector, we need to make sure it is
    // the same size as the normalizer vector so that the update function works.
    normalizer2.resize( normalizer.size(), 0.0 );
  }

  double num_populations = std::sqrt( tau_rise.size() );
  if ( num_populations != std::floor( num_populations ) )
  {
    throw nest::BadProperty(
      "Must provide coefficients for correct number of combinations of "
      "population connections." );
  }

  if ( updateValue< std::vector< long > >( d, Name( "borders" ), borders )
    && borders.size() != 0 )
  {
    if ( borders.size() / 2.0 != num_populations )
    {
      throw nest::BadProperty(
        "Number of borders does not correspond with number of tau "
        "coefficients. Must be two border values per population." );
    }
  }
}

void
mynest::lfp_detector::State_::get( DictionaryDatum& d ) const
{
  std::vector< double >* dg = new std::vector< double >();
  std::vector< double >* g = new std::vector< double >();

  for ( size_t i = 0;
        i < ( y_.size() / State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR );
        ++i )
  {
    dg->push_back(
      y_[ State_::DG + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ]
      + y2_[ State_::DG
          + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ] );
    g->push_back(
      y_[ State_::G + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ]
      + y2_[ State_::G
          + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ] );
  }

  ( *d )[ Name( "dg" ) ] = DoubleVectorDatum( dg );
  ( *d )[ Name( "g" ) ] = DoubleVectorDatum( g );
}

void
mynest::lfp_detector::State_::set( const DictionaryDatum& d )
{
}

mynest::lfp_detector::Buffers_::Buffers_( mynest::lfp_detector& n )
  : logger_( n )
{
}

mynest::lfp_detector::Buffers_::Buffers_( const Buffers_& b,
  mynest::lfp_detector& n )
  : logger_( n )
{
}

/* ----------------------------------------------------------------
 * Default and copy constructor for node, and destructor
 * ---------------------------------------------------------------- */

mynest::lfp_detector::lfp_detector()
  : Archiving_Node()
  , P_()
  , S_( P_ )
  , B_( *this )
{
  recordablesMap_.create();
}

mynest::lfp_detector::lfp_detector( const mynest::lfp_detector& n )
  : Archiving_Node( n )
  , P_( n.P_ )
  , S_( n.S_ )
  , B_( n.B_, *this )
{
}

mynest::lfp_detector::~lfp_detector()
{
}

/* ----------------------------------------------------------------
 * Node initialization functions
 * ---------------------------------------------------------------- */

void
mynest::lfp_detector::init_state_( const Node& proto )
{
  const mynest::lfp_detector& pr = downcast< mynest::lfp_detector >( proto );
  S_ = pr.S_;
}

void
mynest::lfp_detector::init_buffers_()
{
  B_.spikes_.clear(); // includes resize
  B_.projection_vector_.clear();
  Archiving_Node::clear_history();

  B_.logger_.reset();
}

void
mynest::lfp_detector::calibrate()
{
  // Ensures initialization in case mm connected after Simulate
  B_.logger_.init();

  const double h = nest::Time::get_resolution().get_ms();

  V_.num_populations_ = std::sqrt( P_.n_receptors() );

  V_.P11_.resize( P_.n_receptors() );
  V_.P21_.resize( P_.n_receptors() );
  V_.P22_.resize( P_.n_receptors() );
  V_.P11_2_.resize( P_.n_receptors() );
  V_.P21_2_.resize( P_.n_receptors() );
  V_.P22_2_.resize( P_.n_receptors() );

  S_.y_.resize(
    State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * P_.n_receptors(), 0.0 );
  S_.y2_.resize(
    State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * P_.n_receptors(), 0.0 );

  B_.spikes_.resize( P_.n_receptors() );
  B_.projection_vector_.resize( P_.n_receptors() );

  V_.normalizer_.resize( P_.n_receptors() );
  V_.normalizer2_.resize( P_.n_receptors() );

  for ( size_t i = 0; i < P_.n_receptors(); i++ )
  {
    // Set matrix components
    V_.P11_[ i ] = std::exp( -h / P_.tau_decay[ i ] );
    V_.P22_[ i ] = std::exp( -h / P_.tau_rise[ i ] );
    V_.P21_[ i ] = ( ( P_.tau_decay[ i ] * P_.tau_rise[ i ] )
                     / ( P_.tau_decay[ i ] - P_.tau_rise[ i ] ) )
      * ( V_.P11_[ i ] - V_.P22_[ i ] );

    if ( P_.normalizer2[ i ] != 0 )
    {
      V_.P11_2_[ i ] = std::exp( -h / P_.tau_decay2[ i ] );
      V_.P22_2_[ i ] = std::exp( -h / P_.tau_rise2[ i ] );
      V_.P21_2_[ i ] = ( ( P_.tau_decay2[ i ] * P_.tau_rise2[ i ] )
                         / ( P_.tau_decay2[ i ] - P_.tau_rise2[ i ] ) )
        * ( V_.P11_2_[ i ] - V_.P22_2_[ i ] );
    }
    else
    {
      V_.P11_2_[ i ] = 0;
      V_.P22_2_[ i ] = 0;
      V_.P21_2_[ i ] = 0;
    }

    V_.normalizer_[ i ] = P_.normalizer[ i ];
    V_.normalizer2_[ i ] = P_.normalizer2[ i ];

    B_.spikes_[ i ].resize();
    std::set< nest::index > tmp_set;
    B_.projection_vector_[ i ] = tmp_set;
  }

  // Get GIDs of nodes connected to the LFP recorder.
  // TODO: Getting connections this way may introduce some excessive overhead to
  // simulations. Should reconsider implementation if it slows down simulation
  // initialization too much.
  std::deque< nest::ConnectionID > connectome;
  std::vector< size_t > self_target;
  const TokenArray* self_source_a = 0;
  long synapse_label = nest::UNLABELED_CONNECTION;

  // The GID of the lfp_detector
  self_target.push_back( this->get_gid() );
  const TokenArray self_target_a = TokenArray( self_target );

  // We first find all connections to the lfp_detector. The lfp_detector is
  // always the target of a connection, so we are looking for the sources.
  for ( size_t syn_id = 0;
        syn_id < nest::kernel().model_manager.get_num_synapse_prototypes();
        ++syn_id )
  {
    nest::kernel().connection_manager.get_connections(
      connectome, self_source_a, &self_target_a, syn_id, synapse_label );
  }

  // Want to get all targets of these neurons.
  std::vector< size_t > n_sources;
  const TokenArray* target_a = 0;

  // Put all source GIDs that are connected to the lfp_detector in a vector.
  for (
    std::deque< nest::ConnectionID >::const_iterator it = connectome.begin();
    it != connectome.end();
    ++it )
  {
    n_sources.push_back( it->get_source_gid() );
  }
  const TokenArray source_a = TokenArray( n_sources );
  connectome.clear();

  long source_pop;
  long target_pop;

  // Find all connections to the sources found above
  for ( size_t syn_id = 0;
        syn_id < nest::kernel().model_manager.get_num_synapse_prototypes();
        ++syn_id )
  {
    nest::kernel().connection_manager.get_connections(
      connectome, &source_a, target_a, syn_id, synapse_label );
  }

  // Convert connectome deque to map for efficient lookup.
  for (
    std::deque< nest::ConnectionID >::const_iterator con = connectome.begin();
    con != connectome.end();
    ++con )
  {
    nest::index source_gid = con->get_source_gid();
    nest::index target_gid = con->get_target_gid();

    Node* target_node = nest::kernel().node_manager.get_node(
      target_gid, con->get_target_thread() );

    // Skip if target is a device or this model.
    if ( not target_node->has_proxies()
      or target_node->get_model_id() == this->get_model_id() )
    {
      continue;
    }

    // Find the projection of the connection
    source_pop = get_pop_of_gid( source_gid );
    target_pop = get_pop_of_gid( target_gid );
    nest::index projection_index =
      source_pop * V_.num_populations_ + target_pop;

    // Insert the source in the right set in the projection vector. That is,
    // insert the source in the set placed in the projection's place in the
    // projection vector.
    B_.projection_vector_[ projection_index ].insert( source_gid );
  }
}

/* ----------------------------------------------------------------
 * Update and spike handling functions
 * ---------------------------------------------------------------- */
void
mynest::lfp_detector::update( nest::Time const& origin,
  const long from,
  const long to )
{
  assert( to >= 0
    && ( nest::delay ) from
      < nest::kernel().connection_manager.get_min_delay() );
  assert( from < to );

  for ( long lag = from; lag < to; ++lag ) // proceed by stepsize B_.step_
  {
    for ( size_t i = 0; i < P_.n_receptors(); ++i )
    {
      double spikes = B_.spikes_[ i ].get_value( lag );

      // Contribution from first beta
      S_.y_[ State_::G + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR
                           * i ) ] = V_.P21_[ i ]
          * S_.y_[ State_::DG
              + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ]
        + V_.P22_[ i ]
          * S_.y_[ State_::G
              + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ];

      // Contribution from second beta
      S_.y2_[ State_::G + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR
                            * i ) ] = V_.P21_2_[ i ]
          * S_.y2_[ State_::DG
              + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ]
        + V_.P22_2_[ i ]
          * S_.y2_[ State_::G
              + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ];

      // Contribution from first beta
      S_.y_[ State_::DG + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR
                            * i ) ] *= V_.P11_[ i ];

      S_.y_[ State_::DG + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR
                            * i ) ] += V_.normalizer_[ i ] * spikes;

      // Contribution from second beta
      S_.y2_[ State_::DG + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR
                             * i ) ] *= V_.P11_2_[ i ];

      S_.y2_[ State_::DG + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR
                             * i ) ] += V_.normalizer2_[ i ] * spikes;
    }

    // log state data
    B_.logger_.record_data( origin.get_steps() + lag );

  } // for-loop
}

nest::port
mynest::lfp_detector::handles_test_event( nest::SpikeEvent&,
  nest::rport receptor_type )
{
  if ( receptor_type < 0
    || receptor_type > static_cast< nest::port >( P_.n_receptors() ) )
  {
    throw nest::IncompatibleReceptorType(
      receptor_type, get_name(), "SpikeEvent" );
  }
  return receptor_type;
}

void
mynest::lfp_detector::handle( nest::SpikeEvent& e )
{
  assert( e.get_delay() > 0 );

  // TODO: Should probably only allow with borders eventually.
  if ( P_.borders.size() > 0 )
  {
    // Place spike correctly in spike buffer. Must be placed according to which
    // projection it belongs to.
    nest::index gid = e.get_sender_gid();

    std::vector< std::set< nest::index > >::const_iterator proj_it;
    std::set< nest::index >::const_iterator set_it;
    size_t proj_indx = 0;

    // Go through projection vector, see if the incoming GID is in any of the
    // sets, and place add it to the spike buffer in the space of the projection
    // if it is.
    for ( proj_it = B_.projection_vector_.begin();
          proj_it != B_.projection_vector_.end();
          ++proj_it, ++proj_indx )
    {
      set_it = proj_it->find( gid );

      if ( set_it != proj_it->end() )
      {
        B_.spikes_[ proj_indx ].add_value(
          e.get_rel_delivery_steps(
            nest::kernel().simulation_manager.get_slice_origin() ),
          e.get_weight() * e.get_multiplicity() );
      }
    }
  }
  else
  {
    // If we do not have a border vector, we just add the spike to the first
    // element in the spike buffer.
    B_.spikes_[ 0 ].add_value(
      e.get_rel_delivery_steps(
        nest::kernel().simulation_manager.get_slice_origin() ),
      e.get_weight() * e.get_multiplicity() );
  }
}

void
mynest::lfp_detector::handle( nest::DataLoggingRequest& e )
{
  B_.logger_.handle( e );
}

long
mynest::lfp_detector::get_pop_of_gid( const nest::index& gid ) const
{
  long pop = -1;

  // Iterate over borders to find the population of the GID.
  for ( u_long i = 0; i < P_.borders.size(); i += 2 )
  {
    if ( ( u_long ) P_.borders[ i ] <= gid
      && gid <= ( u_long ) P_.borders[ i + 1 ] )
    {
      const double tmp_pop = i / 2;
      pop = tmp_pop;
      break; // A neuron can be in only one population.
    }
  }
  return pop;
}
