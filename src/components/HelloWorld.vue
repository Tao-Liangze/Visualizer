<template>
  <v-container fluid class="pa-0 ma-0" style="height: 100vh; overflow: hidden;">
    <v-row class="no-gutters h-100">
      <!-- 左侧模型区域，约占80% -->
      <v-col cols="9" class="h-100">
        <div id="mocap" class="h-100" />
      </v-col>

      <!-- 右侧视频和控制区域，约占20% -->
      <v-col
        cols="3"
        class="d-flex flex-column h-100"
        style="box-sizing: border-box; padding: 2px;"
      >
        <!-- 两个视频各占约43%高度，略微减小 -->
        <video
          ref="video1"
          src="/dataForVisualizer/1.mp4"
          autoplay
          loop
          style="height: 43%; object-fit: contain; background: #424242; width: 100%; border: 1px solid #555;"
        />
        <video
          ref="video2"
          src="/dataForVisualizer/2.mp4"
          autoplay
          loop
          style="height: 43%; object-fit: contain; background: #424242; width: 100%; border: 1px solid #555; margin-top: 4px;"
        />

        <!-- 控制区，水平居中，紧贴视频下方 -->
        <div
          class="d-flex flex-column align-center"
          style="margin-top: 6px; height: 12%;"
        >
          <!-- 进度条，使用dense减小高度 -->
          <v-slider
            v-model="progress"
            step="0.001"
            :max="videoDuration"
            dense
            style="width: 100%;"
            thumb-label
            @change="onProgressChange"
          />

          <!-- 两个按钮，缩小宽度，水平排列 -->
          <div
            class="d-flex justify-center"
            style="gap: 8px; margin-top: 6px; width: 100%;"
          >
            <v-btn
              @click="changePlaybackSpeed"
              color="secondary"
              style="flex: 1; min-width: 60px; font-size: 0.85rem; padding: 6px 8px;"
            >
              {{ playbackSpeed }}x
            </v-btn>
            <v-btn
              @click="togglePlayPause"
              color="secondary"
              style="flex: 1; min-width: 60px; font-size: 0.85rem; padding: 6px 8px;"
            >
              {{ isPlaying ? '暂停' : '播放' }}
            </v-btn>
            <v-btn
              @click="goToDashboard"
              color="secondary"
              style="flex: 1; min-width: 60px; font-size: 0.85rem; padding: 6px 8px;"
            >
              曲线
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
    
    <!-- 悬浮按键和输入框区域 -->
    <div class="data-input-panel" :class="{ 'panel-collapsed': isPanelCollapsed }">
      <!-- 悬浮按键 -->
      <v-btn 
        class="toggle-button"
        @click="togglePanel"
        color="white"
        fab
        small
        dark
        style="width: 60px; height: 60px;"
      >
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span style="color: black; font-size: 14px; margin-bottom: 4px;">文件</span>
          <v-icon style="color: black; font-size: 18px;">{{ isPanelCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
        </div>
      </v-btn>
      
      <!-- 输入框区域 -->
      <div v-show="!isPanelCollapsed" class="input-fields">
        <div class="input-group">
          <v-text-field
            v-model="subject_id"
            @input="saveSubjectId"
            label="Subject ID"
            outlined
            dense
            hide-details
            class="input-field"
          ></v-text-field>
        </div>
        <div class="input-group">
          <v-text-field
            v-model="trial_id"
            @input="saveTrialId"
            label="Trial ID"
            outlined
            dense
            hide-details
            class="input-field"
          ></v-text-field>
        </div>
        <v-btn
          @click="loadData"
          color="primary"
          class="load-button"
          small
          depressed
          style="width: 100%;"
        >
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

export default {
  name: 'SkeletonViewer',
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
      videos : [],
      animationId: 0, // 当前动画帧
      
      // 添加Subject ID和Trial ID相关变量，从localStorage中获取默认值
      subject_id: localStorage.getItem('subject_id') || '',
      trial_id: localStorage.getItem('trial_id') || '',
      isPanelCollapsed: localStorage.getItem('isPanelCollapsed') === 'true' || false, // 控制面板展开/收起状态
    };
  },
  methods: {
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
    
    // 加载数据的方法（待实现具体逻辑）
    loadData() {
      console.log('Subject ID:', this.subject_id);
      console.log('Trial ID:', this.trial_id);
      // 具体的文件加载逻辑将在后续实现
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
      if(!this.isPlaying){
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
      const [osimText, motText, transformJson] = await Promise.all([
        fetch('/dataForVisualizer/LaiUhlrich2022_scaled.osim').then(r => r.text()),
        fetch('/dataForVisualizer/2.mot').then(r => r.text()),
        fetch('/dataForVisualizer/2.json').then(r => r.json())
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
