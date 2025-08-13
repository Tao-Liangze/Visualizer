export default {
  namespaced: true,
  state: {
    loggedIn: true,
    verified: true,
    username: 'defaultUser',
    user_id: '1',
    profile_picture_url: '/images/Default_pfp.svg',
  },
  mutations: {
    setProfilePicture (state, {value}) {
      state.profile_picture_url = value
    }
  },
  actions: {
    checkToken () {
      // No-op
    },
    logout () {
      console.log("Logout disabled.");
    },
    set_profile_picture_url({ commit }, data) {
      commit('setProfilePicture', { value: data.profile_picture_url })
    }
  }
}
