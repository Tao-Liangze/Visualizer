import Vue from 'vue'
import Router from 'vue-router'

import ConnectDevices from '@/components/pages/ConnectDevices'
import Calibration from '@/components/pages/Calibration'
import Neutral from '@/components/pages/Neutral'
import Session from '@/components/pages/Session'
import SelectSession from '@/components/pages/SelectSession'
import HelloWorld from '@/components/HelloWorld'
import Dashboard from '@/components/pages/Dashboard'
import AnalysisDashboard from '@/components/pages/AnalysisDashboard'
import RecycleBin from "@/components/pages/RecycleBin.vue";
import Subjects from "@/components/pages/Subjects.vue";
import License from '@/components/pages/License'

Vue.use(Router)

var router = new Router({
  mode: "history",
  base: "/",  
  routes: [
    {
      path: '/',
      name: 'HelloWorld',
      component: HelloWorld
    },
    {
      path: '/license',
      name: 'License',
      component: License
    },
    {
      path: '/sessions',
      name: 'SelectSession',
      component: SelectSession
    },
    {
      path: '/:id/connect-devices',
      name: 'ConnectDevicesForId',
      component: ConnectDevices
    },
    {
      path: '/connect-devices',
      name: 'ConnectDevices',
      component: ConnectDevices
    },
    {
      path: '/:id/calibration',
      name: 'Calibration',
      component: Calibration
    },
    {
      path: '/:id/neutral',
      name: 'Neutral',
      component: Neutral
    },
    {
      path: '/session/:id',
      name: 'Session',
      component: Session
    },
    {
      path: '/dashboard/:id',
      name: 'Dashboard',
      component: Dashboard
    },
    {
      path: '/analysis-dashboard/:id/',
      name: 'AnalysisDashboard',
      component: AnalysisDashboard
    },
    {
      path: '/recycle-bin',
      name: 'RecycleBin',
      component: RecycleBin
    },
    {
      path: '/subjects',
      name: 'Subjects',
      component: Subjects
    },
    { 
      path: '*', 
      redirect: '/sessions' 
    }
  ]
})

export default router
