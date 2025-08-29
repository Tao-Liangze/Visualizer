<template>
  <v-container fluid class="pa-0 ma-0" style="height: 100vh; overflow: hidden;">
    <v-row class="no-gutters h-100">
      <!-- 左侧模型区域，约占80% -->
      <v-col cols="9" class="h-100">
        <div id="mocap" class="h-100" />
      </v-col>

      <!-- 右侧视频和控制区域，约占20% -->
      <v-col cols="3" class="d-flex flex-column h-100" style="box-sizing: border-box; padding: 2px;">
        <!-- 两个视频各占约43%高度，略微减小 -->
        <video ref="video1" :src="video1Src" autoplay loop
          style="height: 43%; object-fit: contain; background: #424242; width: 100%; border: 1px solid #555;" />
        <video ref="video2" :src="video2Src" autoplay loop
          style="height: 43%; object-fit: contain; background: #424242; width: 100%; border: 1px solid #555; margin-top: 4px;" />

        <!-- 控制区，水平居中，紧贴视频下方 -->
        <div class="d-flex flex-column align-center" style="margin-top: 6px; height: 12%;">
          <!-- 进度条，使用dense减小高度 -->
          <v-slider v-model="progress" step="0.001" :max="videoDuration" dense style="width: 100%;" thumb-label
            @change="onProgressChange" />

          <!-- 两个按钮，缩小宽度，水平排列 -->
          <div class="d-flex justify-center" style="gap: 8px; margin-top: 6px; width: 100%;">
            <v-btn @click="changePlaybackSpeed" color="secondary"
              style="flex: 1; min-width: 60px; font-size: 0.85rem; padding: 6px 8px;">
              {{ playbackSpeed }}x
            </v-btn>
            <v-btn @click="togglePlayPause" color="secondary"
              style="flex: 1; min-width: 60px; font-size: 0.85rem; padding: 6px 8px;">
              {{ isPlaying ? '暂停' : '播放' }}
            </v-btn>
            <v-btn @click="goToDashboard" color="secondary"
              style="flex: 1; min-width: 60px; font-size: 0.85rem; padding: 6px 8px;">
              曲线
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- 悬浮按键和输入框区域 -->
    <div class="data-input-panel" :class="{ 'panel-collapsed': isPanelCollapsed }">
      <!-- 悬浮按键 -->
      <v-btn class="toggle-button" @click="togglePanel" color="white" fab small dark style="width: 60px; height: 60px;">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span style="color: black; font-size: 14px; margin-bottom: 4px;">文件</span>
          <v-icon style="color: black; font-size: 18px;">{{ isPanelCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'
          }}</v-icon>
        </div>
      </v-btn>

      <!-- 输入框区域 -->
      <div v-show="!isPanelCollapsed" class="input-fields">
        <div class="input-group">
          <v-text-field v-model="subject_id" @input="saveSubjectId" label="Subject ID" outlined dense hide-details
            class="input-field"></v-text-field>
        </div>
        <div class="input-group">
          <v-text-field v-model="trial_id" @input="saveTrialId" label="Trial ID" outlined dense hide-details
            class="input-field"></v-text-field>
        </div>
        <v-btn @click="loadData" color="primary" class="load-button" small depressed style="width: 100%;">
          <span style="color: black; font-size: 14px;">导入</span>
        </v-btn>
      </div>
    </div>
  </v-container>
</template>




<script>
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { mapState, mapActions } from 'vuex'

export default {
  name: 'SkeletonViewer',
  computed: {
    ...mapState('data', ['visualizerPaths'])
  },
  data() {
    return {
      camera: null,
      scene: null,
      renderer: null,
      controls: null,
      animation_json: null,
      animationState: null,
      isPlaying: false,
      meshes: {},
      trajectory: null,
      frameRate: 30, // 骨骼动画的帧率
      progress: 0, // 视频进度
      videoDuration: 0, // 视频总时长
      playbackSpeed: 1, // 当前倍速
      videos: [],
      animationId: 0, // 当前动画帧

      // 添加Subject ID和Trial ID相关变量，从localStorage中获取默认值
      subject_id: localStorage.getItem('subject_id') || '',
      trial_id: localStorage.getItem('trial_id') || '',
      isPanelCollapsed: localStorage.getItem('isPanelCollapsed') === 'true' || false, // 控制面板展开/收起状态

      // subject 相关资源的路径，默认值使用 dataForVisualizer 目录下的内容
      video1Src: '/dataForVisualizer/1.mp4', // 默认视频1路径
      video2Src: '/dataForVisualizer/2.mp4', // 默认视频2路径
      osimPath: '/dataForVisualizer/LaiUhlrich2022_scaled.osim', // 默认骨骼文件路径
      motPath: '/dataForVisualizer/2.mot', // 默认动作文件路径
      jsonPath: '/dataForVisualizer/2.json', // 默认变换文件路径
    };
  },
  methods: {
    ...mapActions('data', ['updateVisualizerPaths']),
    goToDashboard() {
      this.$router.push({ name: 'Dashboard', params: { id: '' } });
    },
    // 切换面板展开/收起状态
    togglePanel() {
      this.isPanelCollapsed = !this.isPanelCollapsed;
      localStorage.setItem('isPanelCollapsed', this.isPanelCollapsed);
    },

    // 保存Subject ID到localStorage
    saveSubjectId(value) {
      localStorage.setItem('subject_id', value);
    },

    // 保存Trial ID到localStorage
    saveTrialId(value) {
      localStorage.setItem('trial_id', value);
    },

    // 加载数据的方法
    async loadData() {
      console.log('Subject ID:', this.subject_id);
      console.log('Trial ID:', this.trial_id);

      if (!this.subject_id || !this.trial_id) {
        console.error('Subject ID 和 Trial ID 不能为空');
        return;
      }

      try {
        // 构建动态路径
        this.updateAssetPaths();

        // 更新视频源并重新加载
        await this.reloadVideos();

        // 重新加载3D场景
        await this.loadAndBuildScene();

        console.log('数据加载完成');
      } catch (error) {
        console.error('数据加载失败:', error);
      }
    },

    // 更新资源路径
    updateAssetPaths() {
      this.video1Src = `${this.subject_id}\\Videos\\Cam0\\InputMedia\\${this.trial_id}\\${this.trial_id}.mp4`
      this.video2Src = `${this.subject_id}\\Videos\\Cam0\\OutputMedia_1x736\\${this.trial_id}\\${this.trial_id}_rotatedwithKeypoints.mp4`;
      this.osimPath = `${this.subject_id}\\OpenSimData\\Model\\LaiUhlrich2022_scaled.osim`;
      this.motPath = `${this.subject_id}\\OpenSimData\\Kinematics\\${this.trial_id}.mot`;
      this.jsonPath = `${this.subject_id}\\VisualizerJsons\\${this.trial_id}\\${this.trial_id}.json`;

      console.log('Updated paths:', {
        video1: this.video1Src,
        video2: this.video2Src,
        osim: this.osimPath,
        mot: this.motPath,
        json: this.jsonPath
      });

      // 更新Vuex store中的路径，以便Dashboard组件使用
      this.updateVisualizerPaths({
        motPath: this.motPath,
        osimPath: this.osimPath,
        jsonPath: this.jsonPath,
        video1Src: this.video1Src,
        video2Src: this.video2Src
      });
    },

    // 重新加载视频
    async reloadVideos() {
      // 暂停当前视频
      if (this.videos && this.videos.length > 0) {
        this.videos.forEach(video => {
          video.pause();
          video.removeEventListener('timeupdate', this.syncProgress);
        });
      }

      // 等待下一帧以确保DOM更新
      await this.$nextTick();

      // 重新设置视频时长和事件监听
      this.setVideoDuration();

      // 重新设置事件监听器
      for (const video of this.videos) {
        video.addEventListener('timeupdate', this.syncProgress);
      }

      // 重置播放状态
      this.isPlaying = false;
      this.progress = 0;
    },

    // 设置视频时长
    setVideoDuration() {
      this.videos = [this.$refs.video1, this.$refs.video2];

      const waitForMetadata = video =>
        new Promise(resolve => {
          if (video.readyState >= 1) {
            resolve(); // 元数据已可用
          } else {
            video.addEventListener("loadedmetadata", resolve, { once: true });
          }
        });

      Promise.all(this.videos.map(waitForMetadata)).then(() => {
        this.videoDuration = this.videos[0].duration;
        console.log("✅ 视频总时长:", this.videoDuration);
      });
    },
    changePlaybackSpeed() {
      // 切换倍速：1x, 1.5x, 2x
      this.playbackSpeed = this.playbackSpeed === 2 ? 1 : this.playbackSpeed + 0.5;
      this.$refs.video1.playbackRate = this.playbackSpeed;
      this.$refs.video2.playbackRate = this.playbackSpeed;
      console.log(`设置倍速为 ${this.playbackSpeed}x`);
    },
    syncProgress() {
      //const videos = [this.$refs.video1, this.$refs.video2];
      const currentTime = this.videos[0].currentTime; // 使用 video1 的播放时间作为参考
      this.progress = Number(currentTime.toFixed(2));
      // 如果视频播放结束，重置进度
      if (currentTime >= this.videoDuration) {
        this.progress = 0; // 进度条重置
      }
    },

    async togglePlayPause() {
      const videos = [this.$refs.video1, this.$refs.video2];
      if (this.isPlaying) {
        videos.forEach(v => v.pause());
        this.animationState.isPlaying = false;
        console.log("暂停视频和动画");
      } else {
        const masterTime = this.$refs.video1.currentTime;
        try {
          // 设置视频1和视频2的同步播放
          await Promise.all(videos.map(video => {
            video.currentTime = masterTime;
            return video.play();
          }));
          this.animationState.isPlaying = true;
        } catch (e) {
          console.error('视频播放失败:', e);
        }
        console.log("开始同步播放视频和动画");
      }
      this.isPlaying = !this.isPlaying;
    },

    // 进度条拖动时，手动控制视频播放位置
    onProgressChange(value) {
      for (const video of this.videos) {
        video.currentTime = value;
      }
      //this.updateFrame();
      if (!this.isPlaying) {
        this.videos.forEach(v => v.pause());
        //this.updateFrame();
        this.animationState.isPlaying = false;

      }
      this.updateFrame();
    },

    async setup3D() {
      const container = document.getElementById('mocap');
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(container.clientWidth, window.innerHeight);
      container.appendChild(this.renderer.domElement);

      this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
      this.camera.position.set(5, 4, 3); // Increased distance for wider view

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000000); // Black background

      const light = new THREE.HemisphereLight(0xffffff, 0x808080, 0.8);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.set(0, 1.5, 0); // Target the upper body/face area
      this.controls.update();

      // 灰黑网格地面
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const context = canvas.getContext('2d');
      context.fillStyle = '#7b878f';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#baccd6';
      context.fillRect(0, 0, 1, 1);
      context.fillRect(1, 1, 1, 1);

      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(10, 10); // Increase grid cells, making each cell smaller

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10), // Keep ground smaller
        new THREE.MeshPhongMaterial({ map: texture, side: THREE.DoubleSide })
      );
      plane.rotation.x = -Math.PI / 2;
      this.scene.add(plane);

      // 光照调整
      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
      dirLight.position.set(-3, 10, -10);
      this.scene.add(dirLight);

      window.addEventListener('resize', this.onResize);
    },

    onResize() {
      const container = document.getElementById('mocap');
      this.camera.aspect = container.clientWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, window.innerHeight);
    },

    parseOsimSkeleton(osimText) {
      const parser = new DOMParser();
      const xml = parser.parseFromString(osimText, "text/xml");
      const bones = [];
      const joints = [];

      const bodies = xml.querySelectorAll("Body");
      bodies.forEach(body => {
        const name = body.getAttribute("name");
        bones.push({ name });
      });

      const jointNodes = xml.querySelectorAll("Joint");
      jointNodes.forEach(joint => {
        const name = joint.getAttribute("name");
        const parent = joint.querySelector("parent_body")?.textContent;
        const child = joint.querySelector("child_body")?.textContent;
        if (parent && child) {
          joints.push({ name, parent, child });
        }
      });

      return { bones, joints };
    },

    parseMotionData(motText) {
      const lines = motText.trim().split('\n');
      let startIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('endheader')) {
          startIdx = i + 1;
          break;
        }
      }
      return lines.slice(startIdx).map(line =>
        line.trim().split(/\s+/).map(parseFloat)
      );
    },

    async loadAndBuildScene() {
      // 清理现有场景中的骨骼模型
      if (this.meshes.skeleton) {
        this.scene.remove(this.meshes.skeleton);
        this.meshes.skeleton.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }

      // 重置meshes对象
      this.meshes = {};

      const [osimText, motText, transformJson] = await Promise.all([
        fetch(this.osimPath).then(r => r.text()),
        fetch(this.motPath).then(r => r.text()),
        fetch(this.jsonPath).then(r => r.json())
      ]);

      const skeleton = this.parseOsimSkeleton(osimText);
      const motionFrames = this.parseMotionData(motText);
      this.animation_json = transformJson;

      this.animationState = {
        skeleton,
        motionFrames,
        currentFrame: 0,
        frameRate: 60,
        isPlaying: true
      };

      const group = new THREE.Group();
      this.scene.add(group);
      this.meshes.skeleton = group;

      const loader = new OBJLoader();

      for (const bone of skeleton.bones) {
        const boneGroup = new THREE.Group();
        boneGroup.name = bone.name;
        group.add(boneGroup);
        this.meshes[bone.name] = boneGroup;

        const geoms = this.animation_json.bodies[bone.name]?.attachedGeometries || [];
        for (const geom of geoms) {
          const objPath = `/dataForVisualizer/geometry-obj/${geom.replace('.vtp', '.obj')}`;
          loader.load(objPath, (obj) => {
            obj.name = bone.name + geom;

            // 强制添加默认材质
            obj.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshLambertMaterial({
                  color: 0xffffff, // Ensure skeleton is white
                });
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            this.meshes[bone.name + geom] = obj;
            boneGroup.add(obj);
          });
        }
      }
    },

    updateFrame() {
      if (!this.animationState?.isPlaying) return;

      const currentTimeInSeconds = this.$refs.video1.currentTime; // 从video1获取当前时间
      const frameIdx = Math.floor(currentTimeInSeconds * this.frameRate); // 根据视频时间计算骨骼动画帧

      this.animationState.currentFrame = frameIdx % this.animationState.motionFrames.length;

      for (const body in this.animation_json.bodies) {
        const data = this.animation_json.bodies[body];
        const geoms = data.attachedGeometries || [];

        for (const geom of geoms) {
          const mesh = this.meshes[body + geom];
          if (!mesh) continue;

          const pos = data.translation[frameIdx];
          const rot = data.rotation[frameIdx];

          mesh.position.set(pos[0], pos[1], pos[2]);
          mesh.setRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
        }
      }
    },

    animate() {
      requestAnimationFrame(this.animate);
      this.updateFrame();
      this.renderer.render(this.scene, this.camera);
      //this.animationId = requestAnimationFrame(this.animate);
    },
  },

  async mounted() {
    // 初始化时从Vuex store获取路径
    if (this.visualizerPaths) {
      this.motPath = this.visualizerPaths.motPath;
      this.osimPath = this.visualizerPaths.osimPath;
      this.jsonPath = this.visualizerPaths.jsonPath;
      this.video1Src = this.visualizerPaths.video1Src;
      this.video2Src = this.visualizerPaths.video2Src;
    }

    await this.setup3D();
    await this.loadAndBuildScene();
    // 设置视频时长
    this.setVideoDuration();

    // 监听 video1 和 video2 的时间更新
    for (const video of this.videos) {
      video.addEventListener('timeupdate', this.syncProgress);
    }
    this.animate();
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);

    for (const video of this.videos) {
      video.pause();
      video.removeEventListener('timeupdate', this.syncProgress);
    }
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    // 释放渲染器
    this.renderer.dispose();
  },
};
</script>

<style scoped>
#mocap {
  border: 2px solid #222;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  background: #1e1e1e;
}

video {
  width: 100%;
  border: 2px solid #222;
}

/* 数据输入面板样式 */
.data-input-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(66, 66, 66, 0.9);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
  z-index: 10;
  min-width: 250px;
}

.panel-collapsed {
  background: rgba(66, 66, 66, 0.7);
  min-width: auto;
  padding: 8px;
}

.toggle-button {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translate(50%, -50%);
  z-index: 11;
}

.input-fields {
  margin-right: 20px;
}

.input-group {
  margin-bottom: 12px;
}

.input-field {
  font-size: 14px;
}

.load-button {
  width: 100%;
}
</style>
