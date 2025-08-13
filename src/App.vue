<template>
  <v-app :style="{background: $vuetify.theme.themes.dark.background}">


    <v-main>      
      <router-view/>
    </v-main>
  </v-app>
</template>

<script>
import { mapActions, mapState } from 'vuex'


export default {
  name: 'App',
  components: {
  },
  computed: {
    ...mapState({
      loggedIn: state => state.auth.loggedIn,
      verified: state => state.auth.verified
    }),
    showLink () {
      return this.loggedIn && this.verified && this.$route.name !== 'SelectSession'
    }
  },
  
}
</script>

<style lang="scss" scoped>
.logo {
  user-select: none;
  margin-top: 10px;
}
</style>
