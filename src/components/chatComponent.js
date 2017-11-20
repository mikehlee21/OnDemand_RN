import React, { Component } from 'react';
import { TouchableOpacity, Image, View, Text, TextInput } from 'react-native';
import { Icon } from 'native-base';
import { connect } from 'react-redux';
import { Actions } from 'react-native-router-flux';
import { bindActionCreators } from 'redux';
import * as actions from '../actions';
import { GiftedChat } from 'react-native-gifted-chat'; // 0.2.5
import LoadingComponent from '../components/loadingComponent';
import Firebase from '../helper/firebasehelper';
import Modal from 'react-native-modal';
import DatePicker from 'react-native-datepicker'

var isFirstLoad = true;
var isMavenActivities = true;

class Chat extends Component {
  state = {
    messages: [],
    requestLoading: true,
    activity: {},
    modalVisible: false,
    editOfferModalVisible: false,
    serviceDate: '',
    price: '',
  };

  componentWillMount() {
    isFirstLoad = true;
    isMavenActivities = true;
    Firebase.initialize();
  }

  componentDidMount() {
    if (this.props.bookingMessage) {
      Firebase.pushMessage(this.props.bookingMessage);
      Firebase.setLastMessage(this.props.bookingMessage.maven, this.props.bookingMessage.sender, this.props.bookingMessage.text);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.maven != undefined && nextProps.activity.initChat !== true) {
      let maven = nextProps.maven.maven;
      var user = maven.userID;
      if (this.props.userID !== undefined) {
        user = this.props.userID;
      }

      if (isMavenActivities) {
        isMavenActivities = false;
        this.props.getMavenActivities(maven._id, this.props.auth.token);
      } else {
        let ma = nextProps.activity.mavenActivities;
        var activity = {};
        if (this.props.userID !== undefined ) {
          for (var i = 0; i < ma.length; i ++) {
            if (ma[i].userID._id === this.props.userID._id) {
              activity = ma[i];
              break;
            }
          }
        } else {
          if (ma.length > 1) {
            activity = ma[0];
          }
        }
        this.setState({ activity });
      }

      this.setState({maven: maven, user: user, requestLoading: false});

      if (isFirstLoad) {
        Firebase.getMessages((snapshot) => {
          var m = {};
          let val = snapshot.val();
          if (val.maven === maven._id && 
            ((val.sender === this.props.profile.myInfo.userId && val.receiver === user._id) || (val.sender === user._id && val.receiver === this.props.profile.myInfo.userId))) {
            m._id = snapshot.key;
            m.text = val.text;
            m.createdAt = new Date(val.createdAt);
            if (val.sender === this.props.profile.myInfo.userId) {
              var u = {};
              u._id = val.sender;
              u.name = this.props.profile.myInfo.firstName + ' ' + this.props.profile.myInfo.lastName;
              u.avatar = this.props.profile.myInfo.displayPicture;
              m.user = u;
            } else if (val.sender === user._id) {
              var u = {};
              u._id = val.sender;
              u.name = user.firstName + ' ' + user.lastName;
              u.avatar = user.displayPicture;
              m.user = u;
            }
            this.setState((previousState) => ({
              messages: GiftedChat.append(previousState.messages, m),
            }));
          }
        });
        isFirstLoad = false;
      }
    }
  }

  onSend(messages = []) {
    var m = {};
    m.sender = this.props.profile.myInfo.userId;
    m.receiver = this.state.user._id;
    m.maven = this.state.maven._id;
    m.text = messages[0].text;
    m.createdAt = messages[0].createdAt.toISOString();
    Firebase.pushMessage(m);
    if (this.props.userID !== undefined) {
      Firebase.setLastMessage(m.maven, m.receiver, m.text);
    } else {
      Firebase.setLastMessage(m.maven, m.sender, m.text);
    }
    if (this.state.messages.length === 0) {
      this.props.initChat(this.state.maven._id, this.props.auth.token);
    }
  }

  showModal() {
    this.setState({modalVisible: true});
  }

  showEditOfferModal(activity) {
    this.setState({price: activity.price.toString(), serviceDate: activity.serviceDate, editOfferModalVisible: true});
  }

  navigateToReview(type) {
    Actions.reviewPage({actId: this.state.activity._id, type: type});
  }

  onPressModalBtn1() {
    this.props.archiveActivity(activity._id, this.props.auth.token);
    this.setState({modalVisible: false});
  }

  onPressModalBtn2() {
    this.setState({modalVisible: false});
  }

  onPressBtn1() {
    let activity = this.state.activity;
    let isMaven = this.props.userID !== undefined?true:false;

    switch (activity.status) {
      case 1:          // Offered
        if (isMaven) {
          this.props.rejectOffer(activity._id, this.props.auth.token);
        } else {
          this.props.cancelOffer(activity._id, 0, this.props.auth.token);
        }
        break;
      case 2:         // Accepted
        if (isMaven) {
          this.props.cancelOffer(activity._id, 1, this.props.auth.token);
        } else {
          this.props.cancelOffer(activity._id, 0, this.props.auth.token);
        }  
        break;
      case 3:         // Rejected
        if (isMaven) {

        } else {
          this.props.archiveActivity(activity._id, this.props.auth.token);
        }
        break;
      case 4:         // Cancelled
        this.showModal();
        break;
      case 5:         // Completed
        if (isMaven) {
          this.navigateToReview(1);
        } else {
          this.navigateToReview(0);
        }
        break;
      case 6:         // CReviewed
        if (isMaven) {
          this.navigateToReview(1);
        }
        break;
      case 7:         // MReviewed
        if (!isMaven) {
          this.navigateToReview(0);
        }
        break;
      case 8:         // Both Reviewed
        this.props.archiveActivity(activity._id, this.props.auth.token);
        break;
      default:
        break;
    }
  }

  onPressBtn2() {
    let activity = this.state.activity;
    let isMaven = this.props.userID !== undefined?true:false;

    switch (activity.status) {
      case 1:          // Offered
        if (isMaven) {
          this.props.acceptOffer(activity._id, this.props.auth.token);
        } else {
          this.showEditOfferModal();
        }
        break;
      case 2:         // Accepted
        this.props.endJob(activity._id, this.props.auth.token);
        break;
      case 3:         // Rejected
        this.showEditOfferModal();
        break;    
      default:
        break;
    }
  }

  render() {
    let activity = this.state.activity;
    let isMaven = this.props.userID !== undefined?true:false;
    var btnText1 = btnText2 = '', boxDisabled = false;
    
    if (activity.status !== undefined) {
      switch (activity.status) {
        case 1:         // Offered
          if (isMaven) {
            btnText1 = 'Reject';
            btnText2 = 'Accept';
          } else {
            btnText1 = 'Cancel Offer';
            btnText2 = 'Edit Offer';
          }
          break;
        case 2:         // Accepted
          btnText1 = 'Cancel Offer';
          btnText2 = 'Completed?';
          break;
        case 3:         // Rejected
          if (isMaven) {
            btnText1 = 'You rejected the Offer~';
            boxDisabled = true;
          } else {
            btnText1 = 'Archive';
            btnText2 = 'Edit Offer';
          }
          break;
        case 4:         // Cancelled
          btnText1 = 'Job Cancelled';
          break;
        case 5:         // Completed
          btnText1 = 'Please leave a Review~';
          break;
        case 6:         // CReviewed
          if (isMaven) {
            btnText1 = 'Please leave a Review~';
          } else {
            btnText1 = 'Review received';
            boxDisabled = true;
          }
          break;
        case 7:         // MReviewed
          if (!isMaven) {
            btnText1 = 'Please leave a Review~';
          } else {
            btnText1 = 'Review received';
            boxDisabled = true;
          }
          break;
        case 8:         // Both Reviewed
          btnText1 = 'Archive?';
          break;
        case 9:         // Archived
          btnText1 = 'Archived';
          boxDisabled = true;
          break;
        default:
          break;
      }
    }

    return (
      this.state.requestLoading ?
      <LoadingComponent/>
      :
      <View style={{flex: 1}}>
        <TouchableOpacity onPress={() => {
          this.props.getMavenDetails(this.state.maven._id, this.props.profile.location, this.props.auth.token);
          let from = isMaven?'':'chat';
          Actions.skillPage({ title: this.state.maven.userID.firstName + ' ' + this.state.maven.userID.lastName, isMe: isMaven, from: from });
        }}>
          <View style={{flexDirection: 'row', height: 70, alignItems: 'center'}}>
            <Image source={{uri: this.state.maven.userID.displayPicture}} style={{width: 50, height: 50, marginHorizontal: 10, borderRadius: 18, borderWidth: 2, borderColor: 'white'}}/>
            <View style={{flex: 1, justifyContent: 'center'}}>
              <Text style={{flex: 1, fontSize: 20, marginTop: 10}}>{this.state.maven.userID.firstName + ' ' + this.state.maven.userID.lastName}</Text>
              <Text style={{flex: 1, fontSize: 16}}>{this.state.maven.title}</Text>
            </View>
            <Icon name="ios-arrow-forward" style={{ fontSize: 25, color: '#90939B', marginHorizontal: 10}} />
          </View>
        </TouchableOpacity>
        {
          btnText1 !== ''?
          <View style={{height: 50, flexDirection: 'row'}}>
            <TouchableOpacity style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#90939B'}} disabled={boxDisabled} onPress={this.onPressBtn1.bind(this)}>
              <Text style={{color: 'white'}}>{btnText1}</Text>
            </TouchableOpacity>
            {
              btnText2 !== '' && 
              <View style={{width: 1, height: 40, backgroundColor: 'white'}}></View>
            }
            {
              btnText2 !== '' && 
              <TouchableOpacity style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#90939B'}} onPress={this.onPressBtn2.bind(this)}>
                <Text style={{color: 'white'}}>{btnText2}</Text>
              </TouchableOpacity>
            }
          </View>
          :
          <View style={{height: 1, backgroundColor: '#90939B'}}/>
        }
        <GiftedChat
          messages={this.state.messages}
          onSend={(messages) => this.onSend(messages)}
          showUserAvatar
          user={{
            // _id: this.props.profile.myInfo.userID,
            _id: this.props.profile.myInfo.userId
          }}
        />
        <Modal
          isVisible={this.state.modalVisible}
          >
          <View style={{backgroundColor:'#fff', paddingHorizontal:15, paddingVertical:10, borderWidth:1, borderRadius:10, width:'100%', justifyContent:'center', alignItems:'center'}}>
            <TouchableOpacity style={{alignSelf:'flex-end'}} onPress={(e)=>{
              this.setState({modalVisible: false});
              }}>
                <Icon name='close' style={{fontSize:40}}/>
            </TouchableOpacity>
            <Text style={{fontSize: 20}}>Archive?</Text>
            <View style={{flexDirection: 'row'}}>
              <TouchableOpacity style={styles.modalBtn} onPress={this.onPressModalBtn1.bind(this)}>
                <Text style={styles.btnText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={this.onPressModalBtn2.bind(this)}>
                <Text style={styles.btnText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal isVisible={this.state.editOfferModalVisible}>
          <View style={{backgroundColor:'#fff', paddingHorizontal:15, paddingVertical:10, borderWidth:1, borderRadius:10, width:'100%'}}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Date</Text>
            <View style={{ marginTop: 3, width: '100%', backgroundColor: 'white', borderRadius: 3, padding: 6 }}>
              <DatePicker
                style={{width: '100%'}}
                date={this.state.serviceDate}
                mode="date"
                placeholder="Service Date"
                format="DD/MM/YYYY"
                minDate="02-01-1900"
                confirmBtnText="Confirm"
                cancelBtnText="Cancel"
                onDateChange={(date) => { this.setState({ serviceDate: date }); }}
                customStyles={{
                    dateInput: {
                        borderRadius:5, backgroundColor:'#fff'
                    }
                }}
              />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 15 }}>Offer Price $</Text>
            <View style={{ marginTop: 3, width: '100%', backgroundColor: 'white', borderRadius: 3, alignItems: 'center', padding: 6 }}>
              <TextInput
                placeholderTextColor="rgba(0,0,0,0.3)"
                placeholder="Price"
                returnKeyType='go'
                keyboardType="numeric"
                maxLength={6}
                value={this.state.price}
                onChangeText={(price) => this.setState({price})}
                underlineColorAndroid='transparent'
                style={{ height: 40, width: '100%', padding: 8, fontSize: 16, borderRadius: 3, borderWidth: 1, borderColor: 'grey' }}
              />
            </View>
            <View style={{flexDirection: 'row'}}>
                <TouchableOpacity style={styles.modalBtn} onPress={() => {
                  this.setState({editOfferModalVisible: false});
                  this.props.editOffer(activity._id, this.state.price, this.state.serviceDate, this.props.auth.token);
                }}>
                  <Text style={styles.btnText}>Submit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtn} onPress={() => {
                  this.setState({editOfferModalVisible: false});
                }}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
          </View>
        </Modal>
      </View>
    );
  }
}

const styles = {
  btnText: {fontWeight: 'bold', fontSize: 15, color: '#fff'},
  modalBtn:{
    flex:1, padding:10, marginBottom:10, marginTop: 30, marginHorizontal: 10, flexDirection:'row', alignItems:'center',
    justifyContent:'center', borderRadius:10, backgroundColor:'#0B486B',
    height: 50,
    shadowOpacity: 0.8,
    shadowRadius: 2,
    shadowOffset: {
      width: 0,
      height: 1
    }
  },
};

const mapStateToProps = (state) =>({
  auth: state.auth,
  profile: state.profile,
  maven: state.explore.maven,
  activity: state.activity,
});

const mapDispatchToProps = (dispatch) =>({
  getMavenDetails: (mavenId, location, token) => dispatch(actions.getMavenDetails(mavenId, location, token)),
  initChat: (mavenId, token) => dispatch(actions.initChat(mavenId, token)),
  getMavenActivities: (mavenId, token) => dispatch(actions.getMavenActivities(mavenId, token)),
  acceptOffer: (actId, token) => dispatch(actions.acceptOffer(actId, token)),
  rejectOffer: (actId, token) => dispatch(actions.rejectOffer(actId, token)),
  cancelOffer: (actId, type, token) => dispatch(actions.cancelOffer(actId, type, token)),
  editOffer: (actId, price, serviceDate, token) => dispatch(actions.editOffer(actId, price, serviceDate, token)),
  endJob: (actId, token) => dispatch(actions.endJob(actId, token)),
  archiveActivity: (actId, token) => dispatch(actions.archiveActivity(actId, token)),
  actions: bindActionCreators(actions, dispatch)
});

export default connect(mapStateToProps, mapDispatchToProps)(Chat);