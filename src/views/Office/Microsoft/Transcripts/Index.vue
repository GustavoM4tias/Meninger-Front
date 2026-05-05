<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Relatórios gerados por IA a partir das reuniões"
        icon="fas fa-wand-magic-sparkles">
        <template #title>Transcrições & IA</template>
        <template #actions>
          <SegmentedControl
            v-model="activeTab"
            :options="tabOptions"
            size="md"
            @update:model-value="onTabChange" />
          <Button v-if="activeTab === 'inperson'"
            variant="primary"
            icon="fas fa-microphone"
            class="!bg-purple-600 hover:!bg-purple-700"
            @click="openNewRecordingModal">
            Nova gravação
          </Button>
          <IconButton
            icon="fas fa-rotate-right"
            label="Atualizar"
            variant="secondary"
            :disabled="isRefreshing"
            :class="isRefreshing ? 'animate-spin' : ''"
            @click="refresh" />
        </template>
      </PageHeader>

      <!-- Gravação ativa (banner) -->
      <Surface v-if="recStore.isActive"
        variant="raised"
        padding="sm"
        class="mb-4 border-violet-500/30 bg-violet-500/10 surface-gradient cursor-pointer"
        @click="router.push('/microsoft/inperson/recording')">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative w-4 h-4 grid place-items-center shrink-0">
              <div class="absolute inset-0 rounded-full bg-red-400/30 animate-ping"></div>
              <div class="w-2 h-2 rounded-full bg-red-500"></div>
            </div>
            <span class="text-sm font-semibold text-violet-700 dark:text-violet-300">Gravando agora</span>
            <span class="text-sm text-violet-500 dark:text-violet-400 truncate">· {{ recStore.title }}</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="font-mono text-sm font-bold text-violet-700 dark:text-violet-300 tabular-nums">
              {{ recStore.timerDisplay }}
            </span>
            <IconButton
              :icon="recStore.isPaused ? 'fas fa-play' : 'fas fa-pause'"
              :label="recStore.isPaused ? 'Retomar' : 'Pausar'"
              variant="ghost"
              size="sm"
              class="!text-violet-600 hover:!bg-violet-500/20"
              @click.stop="recStore.isPaused ? recStore.resume() : recStore.pause()" />
            <span class="text-xs text-violet-500 hidden sm:flex items-center gap-1">
              Abrir <i class="fas fa-arrow-up-right-from-square text-[9px]"></i>
            </span>
          </div>
        </div>
      </Surface>

      <!-- ── Two-column layout ── -->
      <div class="flex flex-col lg:flex-row gap-5 min-h-0">

        <!-- Left: List -->
        <aside class="lg:w-80 shrink-0 flex flex-col gap-3">

          <!-- TAB: Reuniões recentes -->
          <template v-if="activeTab === 'meetings'">
            <div v-if="ts.loadingMeetings" class="space-y-3">
              <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-surface-sunken animate-pulse"></div>
            </div>
            <EmptyState v-else-if="!ts.meetings.length"
              icon="fas fa-calendar-xmark"
              title="Sem reuniões"
              description="Nenhuma reunião Teams encontrada nos últimos 30 dias." />
            <div v-else v-for="m in ts.meetings" :key="m.eventId"
              @click="selectMeeting(m)"
              :class="ts.selectedMeeting?.eventId === m.eventId
                ? 'border-purple-500/40 bg-purple-500/10'
                : 'border-line bg-surface-raised hover:border-purple-500/30 hover:bg-surface-hover'"
              class="rounded-2xl border p-4 cursor-pointer transition-all group shadow-soft">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-sm font-semibold text-ink leading-snug line-clamp-2 flex-1">{{ m.subject }}</p>
                <i class="fas fa-video text-purple-500 shrink-0 mt-0.5"></i>
              </div>
              <div class="flex items-center gap-2 text-xs text-ink-muted mb-2">
                <i class="fas fa-calendar-day"></i>
                <span>{{ fmtDate(m.start) }}</span>
                <span>·</span>
                <span>{{ fmtTime(m.start) }}</span>
              </div>
              <div v-if="m.attendees?.length" class="flex items-center gap-1 text-xs text-ink-subtle">
                <i class="fas fa-users"></i>
                <span>{{ m.attendees.length }} participante(s)</span>
              </div>
              <!-- Status indicator -->
              <div class="mt-2 flex items-center gap-1">
                <div v-if="meetingStatus(m) === 'loading'" class="flex items-center gap-1 text-xs text-ink-subtle">
                  <i class="fas fa-circle-notch animate-spin text-xs"></i> Verificando...
                </div>
                <span v-else-if="meetingStatus(m) === 'no-url'"
                  class="text-xs text-ink-subtle">Sem link Teams</span>
                <span v-else-if="meetingStatus(m) === 'no-transcript'"
                  class="text-xs text-ink-subtle"><i class="fas fa-minus-circle mr-1"></i>Sem transcrição</span>
                <span v-else-if="meetingStatus(m) === 'has-transcript'"
                  class="inline-flex items-center gap-1 text-xs text-accent font-medium">
                  <i class="fas fa-file-lines"></i> Transcrição disponível
                </span>
                <span v-else-if="meetingStatus(m) === 'has-report'"
                  class="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <i class="fas fa-robot"></i> Relatório IA pronto
                </span>
                <span v-else class="text-xs text-ink-subtle">Clique para verificar</span>
              </div>
            </div>
          </template>

          <!-- TAB: Relatórios salvos -->
          <template v-else-if="activeTab === 'reports'">
            <div v-if="ts.loadingReports" class="space-y-3">
              <div v-for="i in 3" :key="i" class="h-28 rounded-2xl bg-surface-sunken animate-pulse"></div>
            </div>
            <EmptyState v-else-if="!ts.reports.length"
              icon="fas fa-robot"
              title="Sem relatórios"
              description="Nenhum relatório gerado ainda." />
            <div v-else v-for="r in ts.reports" :key="r.id"
              @click="ts.openSavedReport(r.id)"
              class="rounded-2xl border border-line bg-surface-raised hover:border-purple-500/30 hover:bg-surface-hover p-4 cursor-pointer transition-all shadow-soft">
              <p class="text-sm font-semibold text-ink line-clamp-2 mb-1">{{ r.subject }}</p>
              <p class="text-xs text-ink-muted mb-2">{{ fmtDate(r.meetingDate) }}</p>
              <div v-if="r.summaryPreview" class="text-xs text-ink-subtle line-clamp-2 mb-2">{{ r.summaryPreview }}</div>
              <div class="flex flex-wrap gap-1.5">
                <Badge v-if="r.acaoCount" variant="danger" size="xs">
                  <span class="font-mono tabular-nums">{{ r.acaoCount }}</span> ações
                </Badge>
                <Badge v-if="r.kpiCount" variant="success" size="xs">
                  <span class="font-mono tabular-nums">{{ r.kpiCount }}</span> KPIs
                </Badge>
                <span v-for="tag in (r.tagsPreview || []).slice(0, 2)" :key="tag"
                  class="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </template>

          <!-- TAB: Presencial -->
          <template v-else>
            <div v-if="ipLoading" class="space-y-3">
              <div v-for="i in 3" :key="i" class="h-24 rounded-2xl bg-surface-sunken animate-pulse"></div>
            </div>
            <div v-else-if="!ipMeetings.length" class="text-center py-12">
              <EmptyState
                icon="fas fa-microphone-slash"
                title="Nenhuma gravação ainda"
                description="Gravação presencial com transcrição em tempo real." />
              <Button variant="primary" icon="fas fa-microphone"
                class="!bg-purple-600 hover:!bg-purple-700 mt-4 mx-auto"
                @click="openNewRecordingModal">
                Gravar agora
              </Button>
            </div>
            <div v-else v-for="m in ipMeetings" :key="m.id"
              @click="selectIpMeeting(m)"
              :class="ipSelected?.id === m.id
                ? 'border-purple-500/40 bg-purple-500/10'
                : 'border-line bg-surface-raised hover:border-purple-500/30 hover:bg-surface-hover'"
              class="rounded-2xl border p-4 cursor-pointer transition-all shadow-soft">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-sm font-semibold text-ink leading-snug line-clamp-2 flex-1">{{ m.title }}</p>
                <i class="fas fa-microphone text-purple-500 shrink-0 mt-0.5 text-xs"></i>
              </div>
              <div class="flex items-center gap-2 text-xs text-ink-muted mb-2">
                <i class="fas fa-calendar-day"></i>
                <span>{{ fmtDate(m.meeting_date) }}</span>
                <span v-if="m.duration_min">· {{ m.duration_min }} min</span>
              </div>
              <div class="mt-1 flex items-center gap-1">
                <span v-if="m.status === 'summarized'"
                  class="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <i class="fas fa-robot"></i> Relatório IA pronto
                </span>
                <span v-else-if="m.status === 'recorded'"
                  class="inline-flex items-center gap-1 text-xs text-accent font-medium">
                  <i class="fas fa-file-lines"></i> Gravação disponível
                </span>
                <span v-else-if="m.status === 'recording'"
                  class="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
                  <i class="fas fa-circle animate-pulse"></i> Em andamento
                </span>
                <span v-else class="text-xs text-ink-subtle">{{ m.status }}</span>
              </div>
            </div>
          </template>

        </aside>

        <!-- Right: Detail panel -->
        <section class="flex-1 min-w-0">

          <!-- ══ TEAMS + REPORTS PANEL ══ -->
          <template v-if="activeTab !== 'inperson'">

            <!-- Empty state -->
            <EmptyState v-if="!ts.selectedMeeting && !ts.loadingTranscript"
              icon="fas fa-file-waveform"
              title="Selecione uma reunião"
              description="Escolha uma reunião na lista para verificar a transcrição e gerar o relatório com IA." />

            <!-- Loading transcript -->
            <div v-else-if="ts.loadingTranscript || ts.checkingTranscript"
              class="h-full flex flex-col items-center justify-center gap-3 text-ink-muted py-24">
              <i class="fas fa-circle-notch animate-spin text-3xl text-purple-500"></i>
              <p class="text-sm">{{ ts.checkingTranscript ? 'Verificando transcrição...' : 'Carregando transcrição...' }}</p>
            </div>

            <!-- Transcript / Report panel -->
            <div v-else-if="ts.selectedMeeting" class="flex flex-col gap-4">

              <!-- Meeting header card -->
              <Surface variant="raised" padding="md" class="surface-gradient">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="text-lg font-semibold text-ink mb-1">{{ ts.selectedMeeting.subject }}</h2>
                    <div class="flex flex-wrap gap-3 text-xs text-ink-muted">
                      <span v-if="ts.selectedMeeting.start"><i class="fas fa-calendar mr-1"></i>{{ fmtDate(ts.selectedMeeting.start) }} {{ fmtTime(ts.selectedMeeting.start) }}</span>
                      <span v-if="ts.selectedMeeting.organizer?.name"><i class="fas fa-user mr-1"></i>{{ ts.selectedMeeting.organizer.name }}</span>
                      <span v-if="ts.selectedMeeting.attendees?.length"><i class="fas fa-users mr-1"></i>{{ ts.selectedMeeting.attendees.length }} participantes</span>
                    </div>
                  </div>
                  <div class="flex gap-2 shrink-0">
                    <Button v-if="ts.report" variant="secondary" size="sm" icon="fas fa-envelope" @click="openEmailModal">
                      E-mail
                    </Button>
                    <a v-if="ts.selectedMeeting.joinUrl" :href="ts.selectedMeeting.joinUrl" target="_blank" rel="noopener"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors">
                      <i class="fas fa-video"></i> Entrar
                    </a>
                  </div>
                </div>
              </Surface>

              <!-- No transcript -->
              <Surface v-if="ts.transcriptInfo && !ts.transcriptInfo.available"
                variant="raised" padding="lg" class="text-center text-ink-muted">
                <i class="fas fa-microphone-slash text-3xl mb-3 block text-ink-subtle"></i>
                <p class="text-sm font-medium mb-1">Sem transcrição disponível</p>
                <p class="text-xs text-ink-subtle max-w-xs mx-auto">A transcrição precisa ser iniciada durante a reunião no Microsoft Teams para que fique disponível aqui.</p>
              </Surface>

              <!-- Has transcripts -->
              <div v-else-if="ts.transcriptInfo?.available" class="space-y-4">

                <!-- Transcript picker (se houver mais de uma) -->
                <div v-if="ts.transcriptInfo.transcripts.length > 1" class="flex gap-2 flex-wrap">
                  <button v-for="t in ts.transcriptInfo.transcripts" :key="t.id"
                    @click="loadTranscript(t)"
                    :class="activeTranscriptId === t.id
                      ? 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                      : 'border-line text-ink-muted hover:border-purple-500/30'"
                    class="px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors">
                    Transcrição {{ fmtDateShort(t.createdAt) }}
                    <span v-if="t.reportReady" class="ml-1 text-emerald-500"><i class="fas fa-robot"></i></span>
                  </button>
                </div>

                <!-- Load transcript button -->
                <div v-if="!ts.cues.length && !ts.loadingTranscript" class="text-center py-8">
                  <Button variant="primary" icon="fas fa-download"
                    class="!bg-purple-600 hover:!bg-purple-700"
                    @click="loadTranscript(ts.transcriptInfo.transcripts[0])">
                    Carregar transcrição
                  </Button>
                </div>

                <!-- Tabs: Transcrição | Relatório -->
                <div v-if="ts.cues.length || ts.report" class="flex flex-col gap-4">
                  <div class="self-start">
                    <SegmentedControl
                      v-model="contentTab"
                      :options="contentTabOptions"
                      size="sm" />
                  </div>

                  <!-- TRANSCRIPT TAB -->
                  <Surface v-show="contentTab === 'transcript'" variant="raised" padding="none" class="overflow-hidden">
                    <div class="px-4 py-3 border-b border-line flex items-center gap-3">
                      <i class="fas fa-magnifying-glass text-ink-subtle text-xs"></i>
                      <input v-model="transcriptSearch" type="text" placeholder="Buscar na transcrição..."
                        class="flex-1 text-sm text-ink bg-transparent border-none focus:outline-none placeholder:text-ink-subtle" />
                      <span class="text-xs text-ink-subtle font-mono tabular-nums">{{ filteredCues.length }} falas</span>
                    </div>
                    <div class="overflow-y-auto" style="max-height: 500px">
                      <div v-for="(cue, i) in filteredCues" :key="i"
                        class="flex items-start gap-3 px-4 py-3 border-b border-line/50 hover:bg-surface-hover/30 transition-colors">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                          :style="{ background: speakerColor(cue.speaker) }">
                          {{ cue.speaker.charAt(0).toUpperCase() }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-0.5">
                            <span class="text-xs font-semibold" :style="{ color: speakerColor(cue.speaker) }">{{ cue.speaker }}</span>
                            <span class="text-xs text-ink-subtle font-mono">{{ cue.startStr }}</span>
                          </div>
                          <p class="text-sm text-ink-muted leading-relaxed" v-html="highlightSearch(cue.text)"></p>
                        </div>
                      </div>
                    </div>
                  </Surface>

                  <!-- REPORT TAB -->
                  <div v-show="contentTab === 'report'">
                    <!-- Generate button -->
                    <Surface v-if="!ts.report && !ts.generatingReport" variant="raised" padding="lg" class="text-center surface-gradient">
                      <div class="w-16 h-16 rounded-2xl bg-purple-500/10 grid place-items-center mx-auto mb-4">
                        <i class="fas fa-robot text-3xl text-purple-500"></i>
                      </div>
                      <p class="text-sm font-medium text-ink mb-1">Relatório não gerado</p>
                      <p class="text-xs text-ink-subtle mb-4 max-w-xs mx-auto">
                        O Gemini vai analisar a transcrição e gerar um relatório completo com resumo, KPIs, ações, checklist e muito mais.
                      </p>
                      <Button variant="primary" icon="fas fa-wand-magic-sparkles"
                        class="!bg-purple-600 hover:!bg-purple-700 mx-auto"
                        @click="doGenerateReport">
                        Gerar Relatório com IA
                      </Button>
                    </Surface>

                    <!-- Generating spinner -->
                    <Surface v-else-if="ts.generatingReport" variant="raised" padding="lg" class="text-center">
                      <div class="w-16 h-16 rounded-2xl bg-purple-500/10 grid place-items-center mx-auto mb-4 animate-pulse">
                        <i class="fas fa-robot text-3xl text-purple-500"></i>
                      </div>
                      <p class="text-sm font-medium text-ink mb-1">Analisando com Gemini...</p>
                      <p class="text-xs text-ink-subtle">Isso pode levar alguns instantes dependendo do tamanho da reunião</p>
                    </Surface>

                    <!-- Report content -->
                    <div v-else-if="ts.report" class="space-y-2">
                      <div class="flex justify-end gap-2">
                        <button @click="doGenerateReport(true)"
                          class="text-xs text-ink-subtle hover:text-purple-500 transition-colors">
                          <i class="fas fa-rotate-right mr-1"></i> Regenerar
                        </button>
                      </div>
                      <ReportPanel :report="ts.report" @email="openEmailModal" />
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </template>

          <!-- ══ INPERSON PANEL ══ -->
          <template v-else>

            <!-- Empty state -->
            <div v-if="!ipSelected && !ipDetailLoading" class="py-12">
              <EmptyState
                icon="fas fa-microphone"
                :title="ipMeetings.length ? 'Selecione uma gravação' : 'Nenhuma gravação ainda'"
                :description="ipMeetings.length ? 'Escolha uma gravação na lista para ver o resumo e transcrição.' : 'Grave sua primeira reunião presencial com transcrição em tempo real.'" />
              <div class="flex justify-center mt-4">
                <Button variant="primary" icon="fas fa-microphone"
                  class="!bg-purple-600 hover:!bg-purple-700"
                  @click="openNewRecordingModal">
                  Nova gravação
                </Button>
              </div>
            </div>

            <!-- Loading -->
            <div v-else-if="ipDetailLoading"
              class="h-full flex flex-col items-center justify-center gap-3 text-ink-muted py-24">
              <i class="fas fa-circle-notch animate-spin text-3xl text-purple-500"></i>
              <p class="text-sm">Carregando...</p>
            </div>

            <!-- Detail -->
            <div v-else-if="ipSelected" class="flex flex-col gap-4">

              <!-- Header card -->
              <Surface variant="raised" padding="md" class="surface-gradient">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="text-lg font-semibold text-ink mb-1">{{ ipSelected.title }}</h2>
                    <div class="flex flex-wrap gap-3 text-xs text-ink-muted">
                      <span v-if="ipSelected.meeting_date"><i class="fas fa-calendar mr-1"></i>{{ fmtDate(ipSelected.meeting_date) }}</span>
                      <span v-if="ipSelected.duration_min"><i class="fas fa-clock mr-1"></i>{{ ipSelected.duration_min }} min</span>
                      <span v-if="ipSelected.location"><i class="fas fa-location-dot mr-1"></i>{{ ipSelected.location }}</span>
                      <span v-if="ipSelected.organizer_name"><i class="fas fa-user mr-1"></i>{{ ipSelected.organizer_name }}</span>
                    </div>
                    <div v-if="ipSelected.attendees_json?.length" class="flex flex-wrap gap-1.5 mt-2">
                      <span v-for="a in ipSelected.attendees_json" :key="a.name || a"
                        class="text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-ink-muted border border-line">
                        {{ a.name || a }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <Button v-if="ipSelected.status === 'summarized'" variant="secondary" size="sm" icon="fas fa-envelope" @click="ipOpenEmail">
                      E-mail
                    </Button>
                    <IconButton icon="fas fa-trash" label="Excluir gravação"
                      variant="danger" size="sm"
                      @click="confirmIpDelete(ipSelected)" />
                  </div>
                </div>
              </Surface>

              <!-- Tabs: Relatório / Transcrição -->
              <div class="self-start">
                <SegmentedControl
                  v-model="ipContentTab"
                  :options="ipContentTabOptions"
                  size="sm" />
              </div>

              <!-- REPORT TAB -->
              <div v-show="ipContentTab === 'report'">
                <!-- Generate button -->
                <Surface v-if="!ipReport && !ipGenerating" variant="raised" padding="lg" class="text-center surface-gradient">
                  <div class="w-16 h-16 rounded-2xl bg-purple-500/10 grid place-items-center mx-auto mb-4">
                    <i class="fas fa-robot text-3xl text-purple-500"></i>
                  </div>
                  <p class="text-sm font-medium text-ink mb-1">Relatório não gerado</p>
                  <p class="text-xs text-ink-subtle mb-4 max-w-xs mx-auto">
                    O Gemini vai analisar a transcrição e gerar um relatório completo com resumo, ações, decisões e muito mais.
                  </p>
                  <Button variant="primary" icon="fas fa-wand-magic-sparkles"
                    class="!bg-purple-600 hover:!bg-purple-700 mx-auto"
                    :disabled="!ipCues.length"
                    @click="ipGenReport()">
                    Gerar Relatório com IA
                  </Button>
                  <p v-if="!ipCues.length" class="text-xs text-ink-subtle mt-3">Carregue a transcrição primeiro</p>
                </Surface>

                <!-- Generating -->
                <Surface v-else-if="ipGenerating" variant="raised" padding="lg" class="text-center">
                  <div class="w-16 h-16 rounded-2xl bg-purple-500/10 grid place-items-center mx-auto mb-4 animate-pulse">
                    <i class="fas fa-robot text-3xl text-purple-500"></i>
                  </div>
                  <p class="text-sm font-medium text-ink mb-1">Analisando com Gemini...</p>
                  <p class="text-xs text-ink-subtle">Isso pode levar alguns instantes</p>
                </Surface>

                <!-- Report -->
                <div v-else-if="ipReport" class="space-y-2">
                  <div class="flex justify-end">
                    <button @click="ipGenReport(true)"
                      class="text-xs text-ink-subtle hover:text-purple-500 transition-colors">
                      <i class="fas fa-rotate-right mr-1"></i> Regenerar
                    </button>
                  </div>
                  <ReportPanel :report="ipReport" @email="ipOpenEmail" />
                </div>
              </div>

              <!-- TRANSCRIPT TAB -->
              <Surface v-show="ipContentTab === 'transcript'" variant="raised" padding="none" class="overflow-hidden">
                <EmptyState v-if="!ipCues.length"
                  icon="fas fa-file-lines"
                  title="Sem transcrição"
                  description="Sem transcrição disponível para esta gravação." />
                <template v-else>
                  <div class="px-4 py-3 border-b border-line flex items-center gap-3">
                    <i class="fas fa-magnifying-glass text-ink-subtle text-xs"></i>
                    <input v-model="ipTranscriptSearch" type="text" placeholder="Buscar na transcrição..."
                      class="flex-1 text-sm text-ink bg-transparent border-none focus:outline-none placeholder:text-ink-subtle" />
                    <span class="text-xs text-ink-subtle font-mono tabular-nums">{{ filteredIpCues.length }} falas</span>
                  </div>
                  <div class="overflow-y-auto" style="max-height: 500px">
                    <div v-for="(cue, i) in filteredIpCues" :key="i"
                      class="flex items-start gap-3 px-4 py-3 border-b border-line/50 hover:bg-surface-hover/30 transition-colors">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                        :style="{ background: ipSpeakerColor(cue.speaker) }">
                        {{ (cue.speaker || '?').charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-0.5">
                          <span class="text-xs font-semibold" :style="{ color: ipSpeakerColor(cue.speaker) }">{{ cue.speaker }}</span>
                          <span class="text-xs text-ink-subtle font-mono">{{ cue.startStr }}</span>
                        </div>
                        <p class="text-sm text-ink-muted leading-relaxed">{{ cue.text }}</p>
                      </div>
                    </div>
                  </div>
                </template>
              </Surface>

            </div>

          </template>

        </section>
      </div>
    </PageContainer>

    <!-- ── Modal: Nova gravação presencial ── -->
    <Modal :open="showNewRecordingModal"
      size="md"
      title="Nova Reunião Presencial"
      subtitle="Transcrição em tempo real com IA"
      @close="showNewRecordingModal = false">

      <div class="space-y-4">
        <Input
          v-model="newRecForm.title"
          label="Título da reunião"
          required
          placeholder="Ex: Reunião Comercial Mensal"
          icon-left="fas fa-tag"
          @keydown.enter="$refs.locInput?.focus?.()" />

        <Input
          ref="locInput"
          v-model="newRecForm.location"
          label="Local"
          hint="Opcional"
          placeholder="Ex: Sala de Reuniões 1"
          icon-left="fas fa-location-dot" />

        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5">
            Participantes <span class="font-normal normal-case">(opcional)</span>
          </label>
          <div v-if="newRecForm.attendees.length" class="flex flex-wrap gap-1.5 mb-2">
            <span v-for="(a, i) in newRecForm.attendees" :key="i"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs">
              {{ a.name }}
              <button @click="newRecForm.attendees.splice(i, 1)" class="hover:text-red-500 transition-colors">
                <i class="fas fa-times text-[9px]"></i>
              </button>
            </span>
          </div>
          <div class="flex gap-2">
            <Input
              v-model="newRecAttendee"
              placeholder="Nome + Enter"
              @keydown.enter.prevent="addNewRecAttendee" />
            <IconButton
              icon="fas fa-plus"
              label="Adicionar participante"
              variant="secondary"
              :disabled="!newRecAttendee.trim()"
              @click="addNewRecAttendee" />
          </div>
        </div>

        <!-- Aviso microfone -->
        <Surface variant="raised" padding="sm" class="border-amber-500/30 bg-amber-500/10">
          <div class="flex items-start gap-2">
            <i class="fas fa-circle-info text-amber-500 dark:text-amber-400 text-sm mt-0.5 shrink-0"></i>
            <p class="text-xs text-amber-700 dark:text-amber-300/80 leading-relaxed">
              O navegador solicitará permissão ao microfone. Recomendado: <strong>Chrome</strong> ou Edge.
            </p>
          </div>
        </Surface>
      </div>

      <template #footer>
        <Button variant="ghost" @click="showNewRecordingModal = false">Cancelar</Button>
        <Button
          variant="primary"
          class="!bg-purple-600 hover:!bg-purple-700"
          :icon="newRecStarting ? 'fas fa-circle-notch fa-spin' : 'fas fa-microphone'"
          :disabled="!newRecForm.title.trim() || newRecStarting"
          @click="handleStartNewRecording">
          {{ newRecStarting ? 'Iniciando...' : 'Iniciar gravação' }}
        </Button>
      </template>
    </Modal>

    <!-- ── Email modal ── -->
    <EmailReportModal
      v-if="showEmailModal"
      :show="showEmailModal"
      :meeting="emailMeetingMeta"
      :report="emailReport"
      :report-id="ts.reportDbId"
      :is-in-person="activeTab === 'inperson'"
      :meeting-id="ipSelected?.id"
      @close="showEmailModal = false"
    />

    <!-- ── Confirm delete (inperson) ── -->
    <Modal :open="!!ipDeleteTarget"
      size="sm"
      title="Excluir gravação?"
      @close="ipDeleteTarget = null">
      <p class="text-sm text-ink-muted">
        "<strong class="text-ink">{{ ipDeleteTarget?.title }}</strong>" será excluída permanentemente.
      </p>
      <template #footer>
        <Button variant="ghost" @click="ipDeleteTarget = null">Cancelar</Button>
        <Button variant="danger" icon="fas fa-trash" @click="ipDoDelete">Excluir</Button>
      </template>
    </Modal>

    <!-- ── Toast ── -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show"
          class="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-overlay border bg-surface-raised text-sm max-w-sm"
          :class="toast.type === 'success'
            ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'border-red-500/30 text-red-600 dark:text-red-400'">
          <i :class="toast.type === 'success' ? 'fas fa-circle-check text-emerald-500' : 'fas fa-circle-exclamation text-red-500'" class="text-base shrink-0"></i>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTranscriptStore } from '@/stores/Microsoft/transcriptStore';
import { useInPersonRecordingStore } from '@/stores/Microsoft/inPersonRecording';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';
import ReportPanel from './components/ReportPanel.vue';
import EmailReportModal from './components/EmailReportModal.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const router   = useRouter();
const ts       = useTranscriptStore();
const recStore = useInPersonRecordingStore();

onMounted(() => ts.fetchMeetings());

watch(() => ts.error, (msg) => {
  if (msg) { showToast(msg, 'error'); ts.error = null; }
});

// ── Tab state ─────────────────────────────────────────────────────────────────
const activeTab          = ref('meetings');  // 'meetings' | 'reports' | 'inperson'
const contentTab         = ref('transcript'); // 'transcript' | 'report'
const ipContentTab       = ref('report');
const activeTranscriptId = ref(null);
const transcriptSearch   = ref('');

const tabOptions = computed(() => [
  { value: 'meetings', label: 'Reuniões', icon: 'fas fa-calendar-days' },
  { value: 'reports',  label: 'Relatórios IA', icon: 'fas fa-robot', count: ts.reports.length || undefined },
  { value: 'inperson', label: 'Presencial', icon: 'fas fa-microphone', count: ipMeetings.value.length || undefined },
]);

const contentTabOptions = computed(() => [
  { value: 'transcript', label: `Transcrição (${ts.cues.length})`, icon: 'fas fa-file-lines' },
  { value: 'report', label: 'Relatório IA', icon: 'fas fa-robot' },
]);

const ipContentTabOptions = computed(() => [
  { value: 'report', label: 'Relatório IA', icon: 'fas fa-robot' },
  { value: 'transcript', label: `Transcrição (${ipCues.value.length})`, icon: 'fas fa-file-lines' },
]);

function onTabChange(v) {
  if (v === 'reports') switchToReports();
  else if (v === 'inperson') switchToInPerson();
}

const isRefreshing = computed(() =>
  activeTab.value === 'meetings' ? ts.loadingMeetings :
  activeTab.value === 'reports'  ? ts.loadingReports  : ipLoading.value
);

// ── Meeting checked status map ─────────────────────────────────────────────────
const statusMap = reactive({});
function meetingStatus(m) { return statusMap[m.eventId] || null; }

async function selectMeeting(m) {
  contentTab.value = 'transcript';
  transcriptSearch.value = '';
  statusMap[m.eventId] = 'loading';
  await ts.checkTranscript(m);
  if (!m.joinUrl) {
    statusMap[m.eventId] = 'no-url';
  } else if (!ts.transcriptInfo?.available) {
    statusMap[m.eventId] = 'no-transcript';
  } else {
    const hasReport = ts.transcriptInfo.transcripts.some(t => t.reportReady);
    statusMap[m.eventId] = hasReport ? 'has-report' : 'has-transcript';
    if (ts.transcriptInfo.transcripts.length === 1) {
      const t = ts.transcriptInfo.transcripts[0];
      if (t.reportReady || t.cached) {
        await loadTranscript(t);
        if (t.reportReady) contentTab.value = 'report';
      }
    }
  }
}

async function loadTranscript(transcriptObj) {
  activeTranscriptId.value = transcriptObj.id;
  try {
    await ts.loadTranscript(ts.transcriptInfo.meetingId, transcriptObj.id);
    if (transcriptObj.reportReady) contentTab.value = 'report';
  } catch {
    showToast('Erro ao carregar transcrição', 'error');
  }
}

async function doGenerateReport(force = false) {
  if (!ts.transcriptInfo?.meetingId || !activeTranscriptId.value) return;
  try {
    await ts.generateReport(ts.transcriptInfo.meetingId, activeTranscriptId.value, force);
    showToast('Relatório gerado com sucesso!', 'success');
    if (ts.selectedMeeting) statusMap[ts.selectedMeeting.eventId] = 'has-report';
  } catch (err) {
    showToast(`Erro ao gerar relatório: ${err.message}`, 'error');
  }
}

async function switchToReports() {
  activeTab.value = 'reports';
  if (!ts.reports.length) await ts.fetchReports();
}

async function switchToInPerson() {
  activeTab.value = 'inperson';
  if (!ipMeetings.value.length) await ipFetchList();
}

function refresh() {
  if (activeTab.value === 'meetings')   ts.fetchMeetings();
  else if (activeTab.value === 'reports') ts.fetchReports();
  else ipFetchList();
}

// ── Transcript search & speaker colors ────────────────────────────────────────
const filteredCues = computed(() => {
  if (!transcriptSearch.value.trim()) return ts.cues;
  const q = transcriptSearch.value.toLowerCase();
  return ts.cues.filter(c => c.text.toLowerCase().includes(q) || c.speaker.toLowerCase().includes(q));
});

const SPEAKER_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316'];
const speakerMap = computed(() => {
  const map = {}; let i = 0;
  for (const c of ts.cues) { if (!map[c.speaker]) map[c.speaker] = SPEAKER_COLORS[i++ % SPEAKER_COLORS.length]; }
  return map;
});
function speakerColor(speaker) { return speakerMap.value[speaker] || '#6b7280'; }

function highlightSearch(text) {
  if (!transcriptSearch.value.trim()) return text;
  const q = transcriptSearch.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${q})`, 'gi'), '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>');
}

// ── InPerson tab ──────────────────────────────────────────────────────────────
const ipMeetings       = ref([]);
const ipLoading        = ref(false);
const ipSelected       = ref(null);
const ipDetailLoading  = ref(false);
const ipCues           = ref([]);
const ipReport         = ref(null);
const ipGenerating     = ref(false);
const ipDeleteTarget   = ref(null);
const ipTranscriptSearch = ref('');

const filteredIpCues = computed(() => {
  if (!ipTranscriptSearch.value.trim()) return ipCues.value;
  const q = ipTranscriptSearch.value.toLowerCase();
  return ipCues.value.filter(c => c.text?.toLowerCase().includes(q) || c.speaker?.toLowerCase().includes(q));
});

const ipSpeakerMapRef = computed(() => {
  const map = {}; let i = 0;
  for (const c of ipCues.value) { if (!map[c.speaker]) map[c.speaker] = SPEAKER_COLORS[i++ % SPEAKER_COLORS.length]; }
  return map;
});
function ipSpeakerColor(speaker) { return ipSpeakerMapRef.value[speaker] || '#6b7280'; }

async function ipFetchList() {
  ipLoading.value = true;
  try { ipMeetings.value = await requestWithAuth(`${API_URL}/microsoft/inperson/meetings`); } catch {}
  ipLoading.value = false;
}

async function selectIpMeeting(m) {
  ipSelected.value      = m;
  ipCues.value          = [];
  ipReport.value        = null;
  ipContentTab.value    = m.status === 'summarized' ? 'report' : 'transcript';
  ipDetailLoading.value = true;
  try {
    const data = await requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${m.id}`);
    ipSelected.value = data;
    ipCues.value     = data.cues || [];
    ipReport.value   = data.report_json || null;
    if (ipReport.value) ipContentTab.value = 'report';
  } catch {}
  ipDetailLoading.value = false;
}

async function ipGenReport(force = false) {
  if (!ipSelected.value) return;
  ipGenerating.value = true;
  try {
    const data = await requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${ipSelected.value.id}/report`, {
      method: 'POST',
      body:   JSON.stringify({ force }),
    });
    ipReport.value   = data.report;
    ipSelected.value = { ...ipSelected.value, status: 'summarized', report_json: data.report };
    const idx = ipMeetings.value.findIndex(x => x.id === ipSelected.value.id);
    if (idx >= 0) ipMeetings.value[idx] = { ...ipMeetings.value[idx], status: 'summarized' };
    showToast('Relatório gerado com sucesso!', 'success');
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  } finally {
    ipGenerating.value = false;
  }
}

function confirmIpDelete(m) { ipDeleteTarget.value = m; }

// ── Modal: nova gravação ──────────────────────────────────────────────────────
const showNewRecordingModal = ref(false);
const newRecStarting        = ref(false);
const newRecAttendee        = ref('');
const newRecForm            = ref({ title: '', location: '', attendees: [] });

function openNewRecordingModal() {
  newRecForm.value     = { title: '', location: '', attendees: [] };
  newRecAttendee.value = '';
  showNewRecordingModal.value = true;
}

function addNewRecAttendee() {
  const name = newRecAttendee.value.trim();
  if (!name) return;
  if (!newRecForm.value.attendees.find(a => a.name === name)) {
    newRecForm.value.attendees.push({ name });
  }
  newRecAttendee.value = '';
}

async function handleStartNewRecording() {
  if (!newRecForm.value.title.trim()) return;
  newRecStarting.value = true;
  try {
    await recStore.startSession({
      title:         newRecForm.value.title.trim(),
      location:      newRecForm.value.location.trim() || null,
      attendees:     newRecForm.value.attendees,
      organizerName: null,
    });
    showNewRecordingModal.value = false;
    // Atualiza lista e muda para aba presencial
    activeTab.value = 'inperson';
    await ipFetchList();
  } catch (err) {
    showToast('Erro ao iniciar: ' + (err.message || 'Verifique a conexão.'), 'error');
  } finally {
    newRecStarting.value = false;
  }
}
async function ipDoDelete() {
  const id = ipDeleteTarget.value?.id;
  if (!id) return;
  try {
    await requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${id}`, { method: 'DELETE' });
    ipMeetings.value = ipMeetings.value.filter(m => m.id !== id);
    if (ipSelected.value?.id === id) { ipSelected.value = null; ipCues.value = []; ipReport.value = null; }
  } catch {}
  ipDeleteTarget.value = null;
}

// ── Email ─────────────────────────────────────────────────────────────────────
const showEmailModal = ref(false);

const emailMeetingMeta = computed(() => {
  if (activeTab.value === 'inperson' && ipSelected.value) {
    return {
      subject:   ipSelected.value.title,
      start:     ipSelected.value.meeting_date,
      organizer: { name: ipSelected.value.organizer_name },
      attendees: ipSelected.value.attendees_json || [],
    };
  }
  return ts.selectedMeeting;
});

const emailReport = computed(() =>
  activeTab.value === 'inperson' ? ipReport.value : ts.report
);

function openEmailModal() {
  if (!ts.reportDbId && activeTab.value !== 'inperson') {
    showToast('Relatório ainda não carregado', 'error');
    return;
  }
  showEmailModal.value = true;
}

function ipOpenEmail() { showEmailModal.value = true; }

// ── Formatters ────────────────────────────────────────────────────────────────
const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function fmtDate(dt) {
  if (!dt) return '';
  const d = new Date(String(dt).replace('T',' ').split('.')[0]);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDateShort(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return `${d.getDate()}/${d.getMonth()+1}`;
}
function fmtTime(dt) {
  if (!dt) return '';
  return String(dt).split('T')[1]?.slice(0, 5) || '';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' });
let toastTimer;
function showToast(message, type = 'success') {
  toast.message = message; toast.type = type; toast.show = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.show = false; }, 3500);
}
</script>

<style scoped>
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.toast-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.toast-enter-from { opacity: 0; transform: translateY(12px) scale(0.97); }
.toast-leave-to { opacity: 0; transform: translateY(6px) scale(0.97); }
</style>
