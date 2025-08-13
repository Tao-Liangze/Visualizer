<template>
  <div id="body" class="chart-page d-flex flex-column">
    <div class="dashboard-body d-flex" v-if="show_dashboard">
        <div v-for="(column, column_name, column_idx) in dashboard.layout" :key="column_idx" :class="column.classes">
          <div v-for="block in column.widgets" :key="block._id" :class="block.classes">
            <component :is="block.component"
                       @changeTimePosition="captureTimePosition"
                       :block="block"
                       :result="result"
                       :timePosition="time_position"
            ></component>
          </div>
        </div>
    </div>

    <div id="button-left" class="pa-2 fixed-button fixed-button-to-left">
      <v-btn @click="leftMenu">
        Data
      </v-btn>
    </div>

    <v-card class="sidebar left-sidebar">
      <div class="pa-4 left-menu-close-button">
        <v-btn width="64px" @click="leftMenu">
          ✖
        </v-btn>
      </div>
      <v-card-text height="100%" v-if="dashboard.data">
        <v-toolbar-title class="text-center">Data Menu</v-toolbar-title>
        <v-subheader class="subheader-bold"></v-subheader>
        <div class="left d-flex flex-column pa-2">
          <v-card>
            <v-card-text>
              <v-select v-model="subject_selected"
                        item-value="id"
                        item-text="name"
                        :items="dashboard.data.subjects"
                        label="Select subject" outlined dense return-object></v-select>
              <v-select v-model="session_selected"
                        item-value="id"
                        item-text="id"
                        :items="filteredSessions"
                        :disabled="!subject_selected"
                        label="Select session" outlined dense return-object></v-select>
              <v-select v-model="trial_selected"
                        item-value="id"
                        item-text="name"
                        :items="filteredTrials"
                        :disabled="!session_selected"
                        label="Select trial" outlined dense return-object></v-select>

<!--              <hr>-->

<!--              {{trial_selected}}-->

            </v-card-text>

            <div class="left d-flex flex-column pa-2">
              <div v-if="loggedIn" class="left d-flex flex-column">

                  <v-dialog v-model="dialog" width="500">
                    <template v-slot:activator="{ on, attrs }">
                        <v-btn small class="mt-4 w-100" v-bind="attrs" v-on="on" v-show="loggedIn && trial_selected">Share analysis publicly</v-btn>
                    </template>

                    <v-card>
                        <v-card-title class="text-h5">
                            Share analysis publicly
                        </v-card-title>

                        <v-card-text>
                          <div v-if="!session_selected?.public">
                            <v-alert color="error" icon="$error">To make your analysis public, you need to make your session public</v-alert>

                            <v-btn color="primary" text @click="setSessionPublic">Make session public</v-btn>
                          </div>

                            <v-container v-if="session_selected?.public">
                                <h3 class="mb-2">Share on</h3>
                                <ShareNetwork network="facebook" class="mr-2" style="text-decoration: none;"
                                    :url="dashboardUrl" title="OpenCap session">
                                    <v-btn><v-icon aria-hidden="false">mdi-facebook</v-icon> &nbsp;Facebook</v-btn>
                                </ShareNetwork>
                                <ShareNetwork network="twitter" class="mr-2" style="text-decoration: none;"
                                    :url="dashboardUrl" title="OpenCap session">
                                    <v-btn><v-icon aria-hidden="false">mdi-twitter</v-icon> &nbsp;Twitter</v-btn>
                                </ShareNetwork>
                                <ShareNetwork network="linkedin" :url="dashboardUrl" style="text-decoration: none;"
                                    title="OpenCap session">
                                    <v-btn><v-icon aria-hidden="false">mdi-linkedin</v-icon> &nbsp;LinkedIn</v-btn>
                                </ShareNetwork>

                                <v-text-field label="Alternatively, copy this link"
                                    v-model="dashboardUrl" class="mt-5" readonly></v-text-field>
                            </v-container>

                        </v-card-text>

                        <v-divider></v-divider>

                        <v-card-actions>
                            <v-spacer></v-spacer>
                            <v-btn color="primary" text @click="dialog = false">
                                Close
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>


                <v-btn class="w-100 mt-4" :to="{ name: 'SelectSession' }">返回动作列表
                </v-btn>

                <v-btn class="w-100 mt-4" @click="$router.push({ name: 'Session', params: { id: session_selected.id } })">
                  转到动作可视化
                </v-btn>

              </div>
            </div>

          </v-card>
        </div>
      </v-card-text>
    </v-card>

  </div>

</template>

<script>
import Visualizer from '@/components/ui/Visualizer';
import { parseMotionData } from '@/util/skeletonParser.js';
import { Line as LineChartGenerator } from 'vue-chartjs/legacy'
import zoomPlugin from 'chartjs-plugin-zoom';

import ScalarPlot from '@/components/ui/ScalarPlot.vue'
import ScalarValue from '@/components/ui/ScalarValue.vue'
import LinearChart from '@/components/ui/LinearChart.vue'
import IconTooltip from '@/components/ui/IconTooltip.vue';

import {
  Chart as ChartJS,
  Title,
  SubTitle,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement} from 'chart.js'

ChartJS.register(
  Title,
  SubTitle,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement,
  zoomPlugin)

export default {
    name: 'AnalysisDashboard',
    components: {
        Visualizer,
        ScalarPlot,
        ScalarValue,
        LinearChart,
        IconTooltip,
    },
    data() {
      return {
        time_position: 0,
        result: {},
        show_dashboard: false,
        dashboard: {
          layout: {
            main: {
              classes: 'col-12',
              widgets: [
                { _id: '1', component: 'LinearChart', classes: 'height-50vh', y_left: ['pelvis_tx', 'pelvis_ty', 'pelvis_tz'], y_right: [] }
              ]
            }
          }
        }
      }
    },
    async mounted() {
        this.loadResult()
    },
    methods: {
        captureTimePosition(time) {
          this.time_position = time;
        },
        async loadResult() {
          try {
            const response = await fetch('/dataForVisualizer/2.mot');
            const motContent = await response.text();
            this.result = parseMotionData(motContent);
            this.show_dashboard = true;
          } catch (error) {
            console.error('Error loading or parsing .mot file:', error);
          }
        },
    },
}
</script>
<style lang="scss">
#body {
  position: relative;
  display: table-cell;
  vertical-align: middle;
  width: 100%;
  height: 100%;
  background-color: black;
}

.sidebar {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 300px;
  transition: transform 0.2s;
  overflow-y: scroll;
}

.left-sidebar {
  left: 0;
}

.right-sidebar {
  right: 0;
}

.content {
  height: calc(100vh - 64px);
  transition: padding-left 0.2s;
}

.left-menu-closed>.left-sidebar {
  transform: translateX(-300px);
}

.right-menu-closed>.right-sidebar {
  transform: translateX(300px);
}

.fixed-button {
  position: fixed;
  bottom: 0px;
  top: 74px;
  display: None;
}

.fixed-button-to-left {
  left: 10px;
}

.fixed-button-to-right {
  right: 10px;
}

.left-menu-close-button {
  float: right;
}

.right-menu-close-button {
  float: left;
}

.subheader-bold {
  font-weight: bold;
}

.content-chart {
  margin: auto;
  width: 60%;
  height: 80%;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #767676;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spinner 0.8s linear infinite;
}

@keyframes spinner {
  to {transform: rotate(360deg);}
}

.height-50vh {
  height: 50vh;
}

.dashboard-body {
  margin-left: 20px;
  margin-right: 10px;
}
</style>
