/*
 *  lfp_detector.h
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

#ifndef LFP_DETECTOR_H
#define LFP_DETECTOR_H

// Includes from nestkernel:
#include "archiving_node.h"
#include "connection.h"
#include "event.h"
#include "nest_types.h"
#include "ring_buffer.h"
#include "universal_data_logger.h"

#include <set>


/* BeginDocumentation
 Name: lfp_detector - Device for calculating LFP signal.

 Description:
 The lfp_detector is a device for recording LFP signals. The detector can be
 used to record from a single neuron, or several neurons at once. If you have
 several neurons and several lfp_detector's, the sum of the LFP would equal the
 LFP recorded by a single lfp_detector. The LFP is found by doing a convolution
 between spike events and a beta function, as described by E. Hagen et al. in
 "Hybrid scheme for modeling local field potentials from point-neuron networks."
 in Cerebral Cortex (2016): 1-36. The modeling of the beta function is
 described by A. Roth and M.C.W. van Rossum in Computational Modeling Methods
 for Neuroscientists, MIT Press 2013, Chapter 6.

 To get the LFP, you have to supply four arrays; "tau_rise", "tau_decay",
 "normalizer" and "borders". "tau_rise" and "tau_decay" constitutes the time
 constants in the beta function, while "normalizer" is the normalizing factor
 of the function. "tau_rise", "tau_decay", and "normalizer" can thus be found
 by optimizing the function
   f(t) = n*tau_d*tau_r / (tau_d - tau_r) * ( exp( -t / tau_d ) -
          exp( -t / tau_r ) ),
 where n = normalizer, tau_r = tau_rise and tau_d = tau_decay, against a double
 exponential kernel.

 "borders" stands for min and max gid of every population connected to the
 lfp_generator. The LFP signal is taken from the target population, and we
 therefore need the "border" array to find out which population the spike comes
 from so that we can calculate the correct LFP.

 The unit of the LFP signal is mV.

 Receives: SpikeEvent, DataLoggingRequest

 SeeAlso:
 */

namespace mynest
{
/**
 * LFP detector
 *
 * It receives spikes via its handle(SpikeEvent&) method, and buffers them
 * according to target population. The LFP is calculated by convoluting the
 * spikes and a beta function in the update() function, and is then stored via
 * its RecordingDevice in the same method.
 */

class lfp_detector : public nest::Archiving_Node
{

public:
  lfp_detector();
  lfp_detector( const lfp_detector& );
  virtual ~lfp_detector();

  /**
   * Import sets of overloaded virtual functions.
   * @see Technical Issues / Virtual Functions: Overriding, Overloading, and
   * Hiding
   */
  using nest::Node::handle;
  using nest::Node::handles_test_event;

  void handle( nest::SpikeEvent& );
  void handle( nest::DataLoggingRequest& );

  nest::port handles_test_event( nest::SpikeEvent&, nest::rport );
  nest::port handles_test_event( nest::DataLoggingRequest&, nest::rport );

  void get_status( DictionaryDatum& ) const;
  void set_status( const DictionaryDatum& );

private:
  void init_state_( const Node& proto );
  void init_buffers_();
  void calibrate();
  void update( nest::Time const&, const long, const long );

  /**
   * Get the population of the gid.
   */
  long get_pop_of_gid( const nest::index& ) const;

  // The next two classes need to be friends to access the State_ class/member
  friend class nest::RecordablesMap< lfp_detector >;
  friend class nest::UniversalDataLogger< lfp_detector >;

  // ----------------------------------------------------------------

  /**
   * Independent parameters of the model.
   */
  struct Parameters_
  {
    std::vector< double > tau_rise;   //!< Rise time in ms for
                                      //!< the first beta function.
    std::vector< double > tau_decay;  //!< Decay time in ms for
                                      //!< the first beta function.
    std::vector< double > tau_rise2;  //!< Rise time in ms for
                                      //!< the second beta function.
    std::vector< double > tau_decay2; //!< Decay time in ms for
                                      //!< the second beta function.

    //!< Normalizing factors for the first and second beta functions.
    std::vector< double > normalizer;
    std::vector< double > normalizer2;

    //! Population borders, first and second GIDs of populations connected to
    //! the lfp_detector. Set up like
    //!   [first_gid_pop_1, last_gid_pop_1, first_gid_pop_2, last_gid_pop_2,
    //!    ... , first_gid_pop_n, last_gid_pop_n]
    std::vector< long > borders;

    Parameters_(); //!< Sets default parameter values

    void get( DictionaryDatum& ) const; //!< Store current values in dictionary
    void set( const DictionaryDatum& ); //!< Set values from dictionary

    //! Return the number of receptor ports
    size_t
    n_receptors() const
    {
      return tau_rise.size();
    }
  };

  // ----------------------------------------------------------------

  /**
   * State variables of the model.
   * @note Copy constructor and assignment operator required because
   *       of C-style arrays.
   */
  struct State_
  {

    /**
     * Enumeration identifying elements in state vector State_::y_.
     * This enum identifies the elements of the vector. It must be public to be
     * accessible from the iteration function. The last two elements of this
     * enum (DG, G) will be repeated n times at the end of the state vector
     * State_::y with n being the number of projections.
     */
    enum StateVecElems
    {
      DG, // 1
      G,  // 2
      STATE_VECTOR_MIN_SIZE
    };

    static const size_t NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR = 2; // DG, G

    std::vector< double > y_;  //!< neuron state for first beta function
    std::vector< double > y2_; //!< neuron state for second beta function

    State_( const Parameters_& ); //!< Default initialization
    State_( const State_& );
    State_& operator=( const State_& );

    void get( DictionaryDatum& ) const;
    void set( const DictionaryDatum& );

  }; // State_

  // ----------------------------------------------------------------

  /**
   * Buffers of the model.
   */
  struct Buffers_
  {
    Buffers_( lfp_detector& );
    Buffers_( const Buffers_&, lfp_detector& );

    //! Logger for all analog data
    nest::UniversalDataLogger< lfp_detector > logger_;

    /** buffers and sums up incoming spikes */
    std::vector< nest::RingBuffer > spikes_;
    std::vector< std::set< nest::index > > projection_vector_;
  };

  // ----------------------------------------------------------------

  /**
   * Internal variables of the model.
   */
  struct Variables_
  {
    std::vector< double > normalizer_;
    std::vector< double > normalizer2_;

    std::vector< double > P11_;
    std::vector< double > P21_;
    std::vector< double > P22_;
    std::vector< double > P11_2_;
    std::vector< double > P21_2_;
    std::vector< double > P22_2_;

    int num_populations_;
  };

  // Access functions for UniversalDataLogger -------------------------------

  //! Read out state vector elements, used by UniversalDataLogger and
  //! RecordablesMap
  template < State_::StateVecElems elem >
  double
  get_y_elem_() const
  {
    double tot_lfp = 0;
    for ( size_t i = 0; i < P_.n_receptors(); ++i )
    {
      // lfp from first beta function
      tot_lfp +=
        S_.y_[ elem + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ];
      // lfp from second beta function
      tot_lfp +=
        S_.y2_[ elem + ( State_::NUMBER_OF_STATES_ELEMENTS_PER_RECEPTOR * i ) ];
    }
    return tot_lfp;
  }

  // Data members -----------------------------------------------------------

  /**
   * @defgroup lfp_detector
   * Instances of private data structures for the different types
   * of data pertaining to the model.
   * @note The order of definitions is important for speed.
   * @{
   */
  Parameters_ P_;
  State_ S_;
  Variables_ V_;
  Buffers_ B_;
  /** @} */

  //! Mapping of recordables names to access functions
  static nest::RecordablesMap< lfp_detector > recordablesMap_;
};

inline nest::port
lfp_detector::handles_test_event( nest::DataLoggingRequest& dlr,
  nest::rport receptor_type )
{
  if ( receptor_type != 0 )
  {
    throw nest::UnknownReceptorType( receptor_type, get_name() );
  }
  return B_.logger_.connect_logging_device( dlr, recordablesMap_ );
}

inline void
lfp_detector::get_status( DictionaryDatum& d ) const
{
  P_.get( d );
  S_.get( d );

  ( *d )[ nest::names::recordables ] = recordablesMap_.get_list();
}

inline void
lfp_detector::set_status( const DictionaryDatum& d )
{
  Parameters_ ptmp = P_; // temporary copy in case of errors
  ptmp.set( d );         // throws if BadProperty
  State_ stmp = S_;      // temporary copy in case of errors
  stmp.set( d );         // throws if BadProperty

  // if we get here, temporaries contain consistent set of properties
  P_ = ptmp;
  S_ = stmp;
}

} // namespace

#endif // LFP_DETECTOR_H //
