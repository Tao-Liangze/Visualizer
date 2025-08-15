<template>
  <div id="body" class="chart-page d-flex flex-column">

    <!-- Google Charts container. -->
    <div class="content-chart">
      <div id="spinner-layer" style="position: relative; width: 100%; height: 100%;" v-show="isLoading">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
          <div class="spinner"></div>
        </div>
        <div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); text-align: center; color:black">
          <h3>Loading Chart</h3>
        </div>
      </div>

      <LineChartGenerator
        id="chart"
        :chart-options="chartOptions"
        :chart-data="chartData"
        style="position: relative; width: 100%; height: 100%;"
        ref="chartRef"
      />
    </div>

    <!-- Left floating button. -->
    <div id="button-left" class="pa-2 fixed-button fixed-button-to-left">
      <v-btn @click="leftMenu">
        数据选项
      </v-btn>
    </div>

    <!-- Right floating button. -->
    <div id="button-right" class="pa-2 fixed-button fixed-button-to-right">
      <v-btn @click="rightMenu">
        绘图选项
      </v-btn>
    </div>

    <!-- Left sidebar. -->
    <v-card class="sidebar left-sidebar" color="#424242">
      <div class="pa-4 left-menu-close-button">
        <v-btn width="36px" height="36px" fab small color="rgba(255, 255, 255, 0.15)" class="elevation-2" @click="leftMenu">
          <v-icon small color="white">mdi-chevron-left</v-icon>
        </v-btn>
      </div>
      <v-card-text height="100%" class="white--text">
        <v-toolbar-title class="text-center white--text sidebar-title">数据可视化</v-toolbar-title>
        <v-subheader class="subheader-bold white--text"></v-subheader>
        <div class="left d-flex flex-column pa-2">

<!--          <hr>-->


          <v-select v-bind:items="x_quantities" v-model="x_quantity_selected" label="X轴" outlined dense
            v-on:change="onXQuantitySelected"></v-select>

          <v-select v-bind:items="y_quantities" label="Y轴" multiple outlined dense
            v-on:change="onYQuantitySelected"></v-select>
        </div>
      </v-card-text>

      <div class="left d-flex flex-column pa-2">

        <v-btn class="w-100" @click="onChartDownload">
          下载曲线图
        </v-btn>

        <v-btn class="w-100 mt-4" @click="$router.push({ name: 'HelloWorld' })">
          转到动作可视化
        </v-btn>

        <div v-if="loggedIn" class="left d-flex flex-column">
          <v-btn class="w-100 mt-4" :to="{ name: 'SelectSession' }">返回动作列表
          </v-btn>
        </div>
      </div>

    </v-card>

    <!-- Right sidebar. -->
    <v-card class="sidebar right-sidebar" color="#424242">
      <div class="pa-4 right-menu-close-button">
        <v-btn width="36px" height="36px" fab small color="rgba(255, 255, 255, 0.15)" class="elevation-2" @click="rightMenu">
          <v-icon small color="white">mdi-chevron-right</v-icon>
        </v-btn>
      </div>
      <v-card-text class="white--text">

        <v-toolbar-title class="text-center white--text sidebar-title">绘图选项</v-toolbar-title>

        <v-subheader class="subheader-bold white--text"></v-subheader>

        <div class="left d-flex flex-column pa-2">
          <v-text-field v-model="chartOptions.plugins.title.text" label="标题" outlined dense></v-text-field>

          <v-text-field v-model="chartOptions.plugins.subtitle.text" label="副标题" outlined dense></v-text-field>

          <v-text-field v-model="chartOptions.scales.x.title.text" label="X轴标题" outlined dense></v-text-field>

          <v-text-field v-model="chartOptions.scales.y.title.text" label="Y轴标题" outlined dense></v-text-field>

          <v-text-field v-model="chart_line_width" label="线宽" outlined dense type="number" @input="drawChart"></v-text-field>

          <v-select v-model="chart_smoothing" v-bind:items="chart_smoothing_options" label="数据平滑"
            outlined dense v-on:change="drawChart"></v-select>

          <v-select v-model="chartOptions.plugins.legend.position" v-bind:items="chart_legend_position" label="图例位置"
            outlined dense v-on:change="placeholderFunction"></v-select>

          <v-select v-model="chartOptions.plugins.legend.align" v-bind:items="chart_legend_alignment"
            label="图例对齐" outlined dense v-on:change="placeholderFunction"></v-select>


          <v-btn class="w-100" @click="onResetZoom">
            Reset Zoom
          </v-btn>

          <icon-tooltip
            tooltip-text="
                Zoom instructions:</br>
                 - <b>Zoom</b>: Click and Drag over a zone.</br>
                 - <b>Move</b>: CTRL + Click and move mouse.</br>
                 - <b>Zoom on X</b>: Mouse wheel on X axis.</br>
                 - <b>Zoom on Y</b>: Mouse wheel on Y axis.</br>
            "
            iconClass="fas fa-question-circle"
            >
          </icon-tooltip>


        </div>

      </v-card-text>
    </v-card>


  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import axios from 'axios'
import { apiError, apiInfo, apiWarning, clearToastMessages } from '@/util/ErrorMessage.js'
import Vue from 'vue'
import store from '@/store/store.js'
import chroma from 'chroma-js';
import { Line as LineChartGenerator } from 'vue-chartjs/legacy'
import zoomPlugin from 'chartjs-plugin-zoom';
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
  name: 'ChartPage',
  components: {
    LineChartGenerator,
    IconTooltip,
   },
  // This function is executed once the page has been loaded.
  created: async function () {
      // Indicates if the current logged in user owns the session.
      this.session_owned = false
      this.current_session_id = this.$route.params.id;

    await this.loadVisualizerData();
  },
  methods: {
    ...mapActions('data', ['loadSession', 'loadSubjects', 'loadExistingSessions']),
    async loadVisualizerData() {
      try {
        const response = await axios.get('/dataForVisualizer/2.mot');
        this.mot_data = response.data;
        
        const lines = this.mot_data.split(/\r?\n/);
        let headerLines = 0;
        while (lines[headerLines].trim() !== 'endheader') {
          headerLines++;
        }
        headerLines++; // Skip endheader line
        
        const columnNames = lines[headerLines].trim().split('	');
        this.x_quantities = columnNames;
        this.y_quantities = columnNames.slice(1);
        this.x_quantity_selected = this.x_quantities[0];
      } catch (error) {
        console.error('Error loading visualizer data:', error);
        apiError('Failed to load visualizer data');
      }
    },
    drawVisualizerChart() {
      // 重定向到drawChart方法，确保一致性
      this.drawChart();
      return;
      /* 以下代码已弃用
      if (!this.mot_data || !this.y_quantities_selected || this.y_quantities_selected.length === 0) {
        this.chartData = { labels: [], datasets: [] };
        return;
      }

      const lines = this.mot_data.split(/\r?\n/);
      let headerLines = 0;
      while (lines[headerLines].trim() !== 'endheader') {
        headerLines++;
      }
      headerLines++; // Skip endheader line

      const columnNames = lines[headerLines].trim().split('	');
      const dataLines = lines.slice(headerLines + 1);

      const chartData = {
        labels: [],
        datasets: []
      };

      const xIndex = columnNames.indexOf(this.x_quantity_selected);

      this.y_quantities_selected.forEach((yQuantity, index) => {
        const yIndex = columnNames.indexOf(yQuantity);
        if (yIndex > -1) {
          const dataset = {
            label: yQuantity,
            data: [],
            borderColor: `hsl(${(index * 40) % 360}, 70%, 50%)`,
            fill: false,
            borderWidth: this.chart_line_width,
            pointRadius: this.chart_point_radius,
            pointStyle: this.chart_point_style,
          };
          chartData.datasets.push(dataset);
        }
      });

      dataLines.forEach(line => {
        const values = line.trim().split('	');
        if (values.length === columnNames.length) {
          chartData.labels.push(values[xIndex]);
          chartData.datasets.forEach(dataset => {
            const yIndex = columnNames.indexOf(dataset.label);
            dataset.data.push(parseFloat(values[yIndex]));
          });
        }
      });

      this.chartData = chartData;
    */},
    // Open and close left menu.
    leftMenu() {
      if (document.getElementById("body").classList.contains("left-menu-closed")) {
        document.getElementById("body").classList.remove("left-menu-closed");
        document.getElementById("button-left").style.display = "None";
      } else {
        document.getElementById("body").classList.add("left-menu-closed");
        document.getElementById("button-left").style.display = "inline-block";
      }
    },
    // Open and close right menu.
    rightMenu() {
      if (document.getElementById("body").classList.contains("right-menu-closed")) {
        document.getElementById("body").classList.remove("right-menu-closed");
        document.getElementById("button-right").style.display = "None";
      } else {
        document.getElementById("body").classList.add("right-menu-closed");
        document.getElementById("button-right").style.display = "inline-block";
      }
    },

    onResetZoom() {
        const chart = this.$refs.chartRef.getCurrentChart();
        if (chart) {
          chart.resetZoom();
        }
    },

    onXQuantitySelected(xQuantitySelected) {
      this.x_quantity_selected = xQuantitySelected;
      this.chartOptions.scales.x.title.text = xQuantitySelected;
      this.drawChart();
    },
    onYQuantitySelected(yQuantitySelected) {
      this.y_quantities_selected = yQuantitySelected;
      this.drawChart();
    },
    onChartDownload() {
      if (this.chart_download_format_selected === 'png') {
          const canvas = document.getElementById("chart").getElementsByTagName('canvas')[0];
          const downloadLink = document.createElement('a');
          downloadLink.setAttribute('download', 'chart.png');
          canvas.toBlob(function(blob) {
          const url = URL.createObjectURL(blob);
          downloadLink.setAttribute('href', url);
          downloadLink.click();
          URL.revokeObjectURL(url);
        }, 'image/png', 1);
      }

    },

    placeholderFunction(selected) {
      console.log(selected);
    },

    async loadTrialResults() {
      // Show spinner and hide chart until finished.
      document.getElementById("spinner-layer").style.display = "block";
      document.getElementById("chart").style.display = "None";

      for (let i=0; i < this.selected_trials.length; i++) {
        // let trial_id = this.selected_trials[i].trial_selected.id
        if (this.selected_trials[i].trial_selected === null) { continue}
        let ik_results = this.selected_trials[i].trial_selected.results.filter(element => element.tag == "ik_results")

        if (ik_results && ik_results.length > 0) {
          let data
          const url = ik_results[0].media

          if (url.startsWith(axios.defaults.baseURL)) {
            const res = await axios.get(url)
            data = res.data
          } else {
            let axiosClean = axios.create()

            const res = await axiosClean.get(url, {
              // Deleting Authorization header, because we have one as global Axios
              // Do not pass out user token to 3rd party sites
              transformRequest: [(data, headers) => {
                delete headers.common.Authorization
                return data
              }]
            })

            data = res.data
          }

          // Split file in lines.
          var lines = data.split("\n");

          // Process line by line. First obtain number of rows and number of columns.
          let k = 0;
          while (lines[k].trim() !== "endheader") {
            k++;
          }

          // Skip endHeader and possible blank lines.
          do {
            k++;
          } while (lines[k].trim() === "");

          // Get column names.
          this.x_quantities = lines[k].trim().split("\t");
          // Create copy for y_quantities and remove time.
          this.y_quantities = this.x_quantities.slice();
          this.y_quantities.shift();
          this.x_quantity_selected = this.x_quantities[0]
        }

      }

      await this.drawChart()

      // Show chart and hide spinner.
      document.getElementById("spinner-layer").style.display = "None";
      document.getElementById("chart").style.display = "block";
    },
    
    // 数据平滑处理函数
    applySmoothing(dataPoints) {
      if (this.chart_smoothing <= 0 || dataPoints.length <= this.chart_smoothing) {
        return dataPoints;
      }
      
      // 创建新的数据点数组
      const smoothedDataPoints = [];
      
      // 对每个Y轴变量进行平滑处理
      for (let i = 0; i < dataPoints.length; i++) {
        const smoothedPoint = { ...dataPoints[i] };
        
        // 对每个选定的Y轴变量应用移动平均
        for (const yVar of this.y_quantities_selected) {
          let sum = 0;
          let count = 0;
          
          // 计算移动平均窗口内的值
          for (let j = Math.max(0, i - this.chart_smoothing); 
               j <= Math.min(dataPoints.length - 1, i + this.chart_smoothing); 
               j++) {
            sum += dataPoints[j][yVar];
            count++;
          }
          
          // 设置平滑后的值
          smoothedPoint[yVar] = sum / count;
        }
        
        smoothedDataPoints.push(smoothedPoint);
      }
      
      return smoothedDataPoints;
    },
    
    async drawChart() {
      if (!this.mot_data || !this.y_quantities_selected || this.y_quantities_selected.length === 0) {
        this.isLoading = true;
        this.chartData = { labels: [], datasets: [] };
        return;
      }
      // Show spinner and hide chart until finished.
      document.getElementById("spinner-layer").style.display = "block";
      document.getElementById("chart").style.display = "None";

      // Get name of selected color scale.
      const selectedOption = this.chart_color_scales_options.find(option => {
        return option.value === this.chart_color_scales_selected;
      });

      const selectedText = selectedOption ? selectedOption.text : "";

      // Create an empty dataset per column.
      let j = 0;
      this.chartData.labels = []
      this.chartData.datasets = []
      var colors = chroma.scale("Viridis").correctLightness().gamma(7.5).cache(false).colors(this.y_quantities_selected.length);
      colors = colors.map((color, index) => {
        if (index === 2) return "#1f77b4"; // 第三根线改为蓝色
        return color;
      });
      if (selectedText == "Spectral" || selectedText == "Rainbow" || selectedText == "Red-Yellow-Blue" || selectedText == "Yellow-Green-Blue")
          colors = chroma.scale(this.chart_color_scales_selected).colors(this.y_quantities_selected.length);
      else if (selectedText == "Yellow-Green")
          colors = chroma.scale(this.chart_color_scales_selected).correctLightness().colors(this.y_quantities_selected.length);
      else if (selectedText == "Red-Green" || selectedText == "Red-Blue" || selectedText == "Green-Blue")
          colors = chroma.scale(this.chart_color_scales_selected).gamma(0.75).cache(false).colors(this.y_quantities_selected.length);
      else
          colors = chroma.scale(this.chart_color_scales_selected).correctLightness().gamma(2).cache(false).colors(this.y_quantities_selected.length);

      // Split file in lines.
      let lines = this.mot_data.split("\n");

      // Process line by line. First obtain number of rows and number of columns.
      let nRows = 0;
      let nColumns = 0;
      let k = 0;
      while (lines[k].trim() !== "endheader") {
        let splitted = lines[k].trim().split("=");
        if (splitted[0] == "nRows") {
          nRows = parseInt(splitted[1]);
        } else if (splitted[0] == "nColumns") {
          nColumns = parseInt(splitted[1]);
        }
        k++;
      }

      // Skip endHeader and possible blank lines.
      do {
        k++;
      } while (lines[k].trim() === "");

      // Get column names.
      let allColumnNames = lines[k].trim().split('\t');
      let columnIndices = {};
      for(let i=0; i<allColumnNames.length; i++) {
          columnIndices[allColumnNames[i]] = i;
      }
      k++;

      let dataset = {}
      for(j = 0; j < this.y_quantities_selected.length; j++) {
        dataset = {};
        dataset["data"] = [];
        dataset["label"] = this.y_quantities_selected[j];
        dataset["backgroundColor"] = colors[j];
        dataset["borderColor"] = colors[j];
        dataset["fill"] = false;
        
        // 确保当点风格为line时，无论线宽如何都能正确显示曲线
        if (this.chart_point_style === 'line') {
          dataset["showLine"] = true;
          dataset["tension"] = 0.4; // 添加一些曲线平滑度
          dataset["borderWidth"] = this.chart_line_width === 0 ? 1 : this.chart_line_width; // 如果线宽为0，使用1作为默认值
          dataset["pointStyle"] = 'circle'; // 当使用line模式时，将点风格改为circle以确保正确显示
          dataset["pointRadius"] = 0; // 隐藏数据点，只显示线条
        } else {
          dataset["borderWidth"] = this.chart_line_width;
          dataset["pointStyle"] = this.chart_point_style;
          dataset["radius"] = 3; // 使用固定的小点大小
        }
        
        dataset["parsing"] = {
            "xAxisKey": this.x_quantity_selected,
            "yAxisKey": this.y_quantities_selected[j]
        }
        this.chartData.datasets.push(dataset);
      }

      // Get data from file.
      let x_idx = columnIndices[this.x_quantity_selected];
      let y_indices = this.y_quantities_selected.map(q => columnIndices[q]);

      let chart_data_points = [];
      for (; k < lines.length; k++) {
        if (lines[k].trim() === "") {
          continue;
        }
        let splitted = lines[k].trim().split("\t");
        let data_point = {};
        data_point[this.x_quantity_selected] = parseFloat(splitted[x_idx]);
        for(let i=0; i<this.y_quantities_selected.length; i++){
            data_point[this.y_quantities_selected[i]] = parseFloat(splitted[y_indices[i]]);
        }
        chart_data_points.push(data_point);
      }
      
      // 应用数据平滑处理
      if (this.chart_smoothing > 0) {
        chart_data_points = this.applySmoothing(chart_data_points);
      }
      
      this.chartData.datasets.forEach(d => {
          d.data = chart_data_points;
      })

      // Show chart and hide spinner.
      document.getElementById("spinner-layer").style.display = "None";
      document.getElementById("chart").style.display = "block";

    },
    generateUUID() {
      return "10000000-1000-4000-8000-100000000000".replace(
          /[018]/g,
          c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    },
  },
  data() {
    return {



      subject_selected: "",

      public_session_id: "",
      current_session_id: "",
      session_selected: "",
      trial_selected: "",
      trial_names: [],
      trial_ids: [],
      y_quantities: [],
      y_quantities_selected: [],
      y_data: [],
      x_quantities: [],
      x_quantity_selected: "",
      x_data: [],
      placeholder: [],
      chart_download_format_selected: 'png',
      chart_color_scales_selected: "Viridis", // 默认配色方案
      chart_color_scales_options: [
        { text: 'Viridis (默认)', value: 'Viridis' },
        { text: 'Plasma (暗色系推荐)', value: 'Plasma' },
        { text: 'Hot', value: ['black', 'red', 'yellow'] },
        { text: 'Yellow-Blue', value: ['yellow', 'blue'] },
        { text: 'Yellow-Green', value: ['yellow', 'green'] },
        { text: 'Grays', value: ['lightgrey', 'black'] },
        { text: 'Blues', value: ['#add8e6', '#191970'] },
      ],
      chart_legend_position: ["top", "right", "bottom", "left", "chartArea"],
      chart_legend_alignment: ["start", "center", "end"],
      chartData: {
        datasets: [{
          label: 'Empty',
          data: [],
        }]
      },
      chart_line_width: 3,
      chart_point_style_options: ["none", "circle", "cross", "crossRot", "dash", "line", "rect", "rectRounded", "rectRot", "star", "triangle"],
      // 点风格选项的显示名称，"line"表示连续曲线
      chart_point_style: 'line',
      // 数据平滑选项
      chart_smoothing: 0, // 默认不平滑
      chart_smoothing_options: [
        { text: '无平滑', value: 0 },
        { text: '轻度平滑', value: 5 },
        { text: '中度平滑', value: 10 },
        { text: '重度平滑', value: 20 }
      ],
      // 保留但不再使用的点大小属性
      chart_point_radius: 6,
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: '时间 (s)',
              font: {
                size: 20
              },
            },
            type: 'linear',
          },
          y: {
            title: {
              display: true,
              text: 'Y轴标题',
              font: {
                size: 20
              },
            },
            type: 'linear',
          },
        },
        plugins: {
          title: {
            display: true,
            text: '骨骼模型关节自由度',
            font: {
              size: 35
            },
          },
          subtitle: {
            display: true,
            text: 'Subtitle',
            font: {
              size: 15
            },
            padding: {
              top: 10,
              bottom: 35
            }
          },
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              font: {
                size: 15
              },
              usePointStyle: false,
              boxWidth: 15,
              generateLabels: function(chart) {
                const datasets = chart.data.datasets;
                return datasets.map(function(dataset, i) {
                  return {
                    text: dataset.label,
                    fillStyle: dataset.borderColor,
                    strokeStyle: dataset.borderColor,
                    lineWidth: 2,
                    hidden: !chart.isDatasetVisible(i),
                    index: i
                  };
                });
              }
            }
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'xy',
              modifierKey: 'ctrl',
            },
            zoom: {
              mode: 'xy',
              overScaleMode: 'xy',
              drag: {
                enabled: true,
              },
              wheel: {
                enabled: true,
              }
            }
          }
        },
      }
    }
  },
  computed: {
    ...mapState({
      sessions: state => state.data.sessions,
      session: state => state.data.session,
      subjects: state => state.data.subjects,
      loggedIn: state => state.auth.verified,
      user_id: state => state.auth.user_id,
    }),

  },
  async mounted () {
    // Set session as current session.
    this.current_session_id = this.$route.params.id;

    // If not logged in, load session from params and show trials.
    await this.loadSubjects({session_id: this.current_session_id})
    await this.loadSession(this.current_session_id)
    if (this.current_session_id && this.session?.public) {
      this.public_session_id = this.current_session_id
    }

    if (this.current_session_id && this.selected_trials.length === 0) {
        let subject = this.subjects.filter(subject => subject.id === this.session.subject)[0]
        this.selected_trials.push({
          uuid: this.generateUUID(),
          subject_selected: subject,
          session_selected: this.session,
          trial_selected: this.session.trials.filter(trial => trial.status === 'done' && trial.name !== 'neutral' && trial.name !== 'calibration')[0],
          offset: 0,
        })
    }
    if (!this.current_session_id && this.selected_trials.length == 0) {
      this.selected_trials.push({
        uuid: this.generateUUID(),
        subject_selected: null,
        session_selected: null,
        trial_selected: null,
        offset: 0,
      })
    }

    await this.loadTrialResults()
    if (this.loggedIn && this.sessions.length <= 1) {
      await this.loadExistingSessions({reroute: false, update_sessions: true})
    }
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
  background-color: white;
}

.sidebar {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 300px;
  transition: transform 0.2s, box-shadow 0.3s;
  overflow-y: auto;
  color: white;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.left-sidebar {
  left: 0;
  background: linear-gradient(135deg, #2c3e50, #4a6572);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.right-sidebar {
  right: 0;
  background: linear-gradient(135deg, #1a2a6c, #2a4858);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px 0 0 8px;
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

/* 美化滚动条 */
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.5);
}

.sidebar-title {
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 1px;
  margin: 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.subheader-bold {
  font-weight: 500;
  letter-spacing: 0.5px;
  opacity: 0.9;
  margin-top: 10px;
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
  background-color: white;
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
</style>