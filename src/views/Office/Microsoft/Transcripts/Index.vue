<!-- Central Microsoft › aba Reuniões — panel do hub /microsoft/teams (sem
     PageContainer/PageHeader próprios). A rota antiga /microsoft/transcripts
     virou redirect; deep-link nas sub-abas via ?sub=meetings|reports|inperson. -->
<template>
  <div>

      <!-- Toolbar: sub-abas + ações -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <SegmentedControl
          v-model="activeTab"
          :options="tabOptions"
          size="sm"
          @update:model-value="onTabChange" />
        <span class="flex-1"></span>
        <Button v-if="activeTab === 'inperson'"
          variant="primary"
          size="sm"
          icon="fas fa-microphone"
          class="!bg-accent hover:!bg-accent max-sm:!min-h-10"
          @click="openNewRecordingModal">
          Nova gravação
        </Button>
        <IconButton
          icon="fas fa-rotate-right"
          size="sm"
          label="Atualizar"
          variant="secondary"
          :disabled="isRefreshing"
          :class="isRefreshing ? 'animate-spin' : ''"
          class="max-sm:!h-10 max-sm:!w-10"
          @click="refresh" />
      </div>

      <!-- Gravação ativa (banner) -->
      <Surface v-if="recStore.isActive"
        variant="raised"
        padding="sm"
        class="mb-4 border-accent/30 bg-accent/10 surface-gradient cursor-pointer"
        @click="router.push('/microsoft/inperson/recording')">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative w-4 h-4 grid place-items-center shrink-0">
              <div class="absolute inset-0 rounded-full bg-data-neg/30 animate-ping"></div>
              <div class="w-2 h-2 rounded-full bg-data-neg"></div>
            </div>
            <span class="text-sm font-semibold text-accent">Gravando agora</span>
            <span class="text-sm text-accent truncate">· {{ recStore.title }}</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="font-mono text-sm font-bold text-accent tabular-nums">
              {{ recStore.timerDisplay }}
            </span>
            <IconButton
              :icon="recStore.isPaused ? 'fas fa-play' : 'fas fa-pause'"
              :label="recStore.isPaused ? 'Retomar' : 'Pausar'"
              variant="ghost"
              size="sm"
              class="!text-accent hover:!bg-accent/20"
              @click.stop="recStore.isPaused ? recStore.resume() : recStore.pause()" />
            <span class="text-xs text-accent hidden sm:flex items-center gap-1">
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
                ? 'border-accent/40 bg-accent/10'
                : 'border-line bg-surface-raised hover:border-accent/30 hover:bg-surface-hover'"
              class="rounded-2xl border p-4 cursor-pointer transition-all group shadow-soft">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-sm font-semibold text-ink leading-snug line-clamp-2 flex-1">{{ m.subject }}</p>
                <i :class="m.isInstant ? 'fas fa-bolt text-data-warn' : 'fas fa-video text-accent'"
                  class="shrink-0 mt-0.5"></i>
              </div>
              <div v-if="m.isInstant" class="mb-2">
                <span class="inline-flex items-center gap-1 text-micro font-medium px-2 py-0.5 rounded-full bg-data-warn/10 text-data-warn">
                  <i class="fas fa-bolt text-[9px]"></i> Instantânea
                </span>
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
                  class="inline-flex items-center gap-1 text-xs text-data-pos font-medium">
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
              class="rounded-2xl border border-line bg-surface-raised hover:border-accent/30 hover:bg-surface-hover p-4 cursor-pointer transition-all shadow-soft">
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
                  class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
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
                class="!bg-accent hover:!bg-accent mt-4 mx-auto"
                @click="openNewRecordingModal">
                Gravar agora
              </Button>
            </div>
            <div v-else v-for="m in ipMeetings" :key="m.id"
              @click="selectIpMeeting(m)"
              :class="ipSelected?.id === m.id
                ? 'border-accent/40 bg-accent/10'
                : 'border-line bg-surface-raised hover:border-accent/30 hover:bg-surface-hover'"
              class="rounded-2xl border p-4 cursor-pointer transition-all shadow-soft">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-sm font-semibold text-ink leading-snug line-clamp-2 flex-1">{{ m.title }}</p>
                <i class="fas fa-microphone text-accent shrink-0 mt-0.5 text-xs"></i>
              </div>
              <div class="flex items-center gap-2 text-xs text-ink-muted mb-2">
                <i class="fas fa-calendar-day"></i>
                <span>{{ fmtDate(m.meeting_date) }}</span>
                <span v-if="m.duration_min">· {{ m.duration_min }} min</span>
              </div>
              <div class="mt-1 flex items-center gap-1">
                <span v-if="m.status === 'summarized'"
                  class="inline-flex items-center gap-1 text-xs text-data-pos font-medium">
                  <i class="fas fa-robot"></i> Relatório IA pronto
                </span>
                <span v-else-if="m.status === 'recorded'"
                  class="inline-flex items-center gap-1 text-xs text-accent font-medium">
                  <i class="fas fa-file-lines"></i> Gravação disponível
                </span>
                <span v-else-if="m.status === 'recording'"
                  class="inline-flex items-center gap-1 text-xs text-data-neg font-medium">
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
              <i class="fas fa-circle-notch animate-spin text-3xl text-accent"></i>
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
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors">
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
                <!-- O backend diz POR QUE não achou (transcrição nunca ligada,
                     reunião que a pessoa só participou e ninguém carregou
                     ainda). Antes essa explicação existia e não chegava na tela. -->
                <p class="text-xs text-ink-subtle max-w-sm mx-auto">
                  {{ ts.transcriptInfo.hint || 'A transcrição precisa ser iniciada durante a reunião no Microsoft Teams para que fique disponível aqui.' }}
                </p>
              </Surface>

              <!-- Has transcripts -->
              <div v-else-if="ts.transcriptInfo?.available" class="space-y-4">

                <!-- Veio de outro participante: a transcrição é a mesma para
                     todo mundo que esteve na sala, e o relatório também. Dizer
                     de quem veio evita a impressão de que o Office baixou de
                     novo (e de que alguém pagou outro relatório de IA). -->
                <div v-if="ts.transcriptInfo.viaShared || ts.sharedFrom"
                  class="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/25">
                  <i class="fas fa-user-group text-accent text-xs mt-0.5 shrink-0"></i>
                  <p class="text-xs text-accent">
                    Você participou desta reunião.
                    {{ ts.sharedFrom ? `Transcrição e relatório carregados por ${ts.sharedFrom}.` : 'A transcrição já estava carregada no Office.' }}
                    Abrir aqui não baixa nada de novo nem gera outro relatório.
                  </p>
                </div>


                <!-- Transcript picker (se houver mais de uma) -->
                <div v-if="ts.transcriptInfo.transcripts.length > 1" class="flex gap-2 flex-wrap">
                  <button v-for="t in ts.transcriptInfo.transcripts" :key="t.id"
                    @click="loadTranscript(t)"
                    :class="activeTranscriptId === t.id
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-line text-ink-muted hover:border-accent/30'"
                    class="px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors">
                    Transcrição {{ fmtDateShort(t.createdAt) }}
                    <span v-if="t.reportReady" class="ml-1 text-data-pos"><i class="fas fa-robot"></i></span>
                  </button>
                </div>

                <!-- Load transcript button -->
                <div v-if="!ts.cues.length && !ts.loadingTranscript" class="text-center py-8">
                  <Button variant="primary" icon="fas fa-download"
                    class="!bg-accent hover:!bg-accent"
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
                      <div class="w-16 h-16 rounded-2xl bg-accent/10 grid place-items-center mx-auto mb-4">
                        <i class="fas fa-robot text-3xl text-accent"></i>
                      </div>
                      <p class="text-sm font-medium text-ink mb-1">Relatório não gerado</p>
                      <p class="text-xs text-ink-subtle mb-4 max-w-xs mx-auto">
                        O Gemini vai analisar a transcrição e gerar um relatório completo com resumo, KPIs, ações, checklist e muito mais.
                      </p>
                      <Button variant="primary" icon="fas fa-wand-magic-sparkles"
                        class="!bg-accent hover:!bg-accent mx-auto"
                        @click="doGenerateReport">
                        Gerar Relatório com IA
                      </Button>
                    </Surface>

                    <!-- Generating spinner -->
                    <Surface v-else-if="ts.generatingReport" variant="raised" padding="lg" class="text-center">
                      <div class="w-16 h-16 rounded-2xl bg-accent/10 grid place-items-center mx-auto mb-4 animate-pulse">
                        <i class="fas fa-robot text-3xl text-accent"></i>
                      </div>
                      <p class="text-sm font-medium text-ink mb-1">Analisando com Gemini...</p>
                      <p class="text-xs text-ink-subtle">Isso pode levar alguns instantes dependendo do tamanho da reunião</p>
                    </Surface>

                    <!-- Report content -->
                    <div v-else-if="ts.report" class="space-y-2">
                      <div class="flex justify-end gap-2">
                        <button @click="doGenerateReport(true)"
                          class="text-xs text-ink-subtle hover:text-accent transition-colors">
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
                  class="!bg-accent hover:!bg-accent"
                  @click="openNewRecordingModal">
                  Nova gravação
                </Button>
              </div>
            </div>

            <!-- Loading -->
            <div v-else-if="ipDetailLoading"
              class="h-full flex flex-col items-center justify-center gap-3 text-ink-muted py-24">
              <i class="fas fa-circle-notch animate-spin text-3xl text-accent"></i>
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
                  <div class="w-16 h-16 rounded-2xl bg-accent/10 grid place-items-center mx-auto mb-4">
                    <i class="fas fa-robot text-3xl text-accent"></i>
                  </div>
                  <p class="text-sm font-medium text-ink mb-1">Relatório não gerado</p>
                  <p class="text-xs text-ink-subtle mb-4 max-w-xs mx-auto">
                    O Gemini vai analisar a transcrição e gerar um relatório completo com resumo, ações, decisões e muito mais.
                  </p>
                  <Button variant="primary" icon="fas fa-wand-magic-sparkles"
                    class="!bg-accent hover:!bg-accent mx-auto"
                    :disabled="!ipCues.length"
                    @click="ipGenReport()">
                    Gerar Relatório com IA
                  </Button>
                  <p v-if="!ipCues.length" class="text-xs text-ink-subtle mt-3">Carregue a transcrição primeiro</p>
                </Surface>

                <!-- Generating -->
                <Surface v-else-if="ipGenerating" variant="raised" padding="lg" class="text-center">
                  <div class="w-16 h-16 rounded-2xl bg-accent/10 grid place-items-center mx-auto mb-4 animate-pulse">
                    <i class="fas fa-robot text-3xl text-accent"></i>
                  </div>
                  <p class="text-sm font-medium text-ink mb-1">Analisando com Gemini...</p>
                  <p class="text-xs text-ink-subtle">Isso pode levar alguns instantes</p>
                </Surface>

                <!-- Report -->
                <div v-else-if="ipReport" class="space-y-2">
                  <div class="flex justify-end">
                    <button @click="ipGenReport(true)"
                      class="text-xs text-ink-subtle hover:text-accent transition-colors">
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
          <label class="block text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5">
            Participantes <span class="font-normal normal-case">(opcional)</span>
          </label>
          <div v-if="newRecForm.attendees.length" class="flex flex-wrap gap-1.5 mb-2">
            <span v-for="(a, i) in newRecForm.attendees" :key="i"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs">
              {{ a.name }}
              <button @click="newRecForm.attendees.splice(i, 1)" class="hover:text-data-neg transition-colors">
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
        <Surface variant="raised" padding="sm" class="border-data-warn/30 bg-data-warn/10">
          <div class="flex items-start gap-2">
            <i class="fas fa-circle-info text-data-warn text-sm mt-0.5 shrink-0"></i>
            <p class="text-xs text-data-warn/80 leading-relaxed">
              O navegador solicitará permissão ao microfone. Recomendado: <strong>Chrome</strong> ou Edge.
            </p>
          </div>
        </Surface>
      </div>

      <template #footer>
        <Button variant="ghost" @click="showNewRecordingModal = false">Cancelar</Button>
        <Button
          variant="primary"
          class="!bg-accent hover:!bg-accent"
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


  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTranscriptStore } from '@/stores/Microsoft/transcriptStore';
import { useInPersonRecordingStore } from '@/stores/Microsoft/inPersonRecording';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';
import ReportPanel from './components/ReportPanel.vue';
import EmailReportModal from './components/EmailReportModal.vue';

import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import { useToast } from 'vue-toastification';


const toast = useToast();
const router   = useRouter();
const route    = useRoute();
const ts       = useTranscriptStore();
const recStore = useInPersonRecordingStore();

onMounted(async () => {
  await ts.fetchMeetings();
  // Deep-link nas sub-abas (?sub=): links antigos redirecionados preservam a query
  const sub = route.query.sub;
  if (sub === 'reports' || sub === 'inperson') onTabChange(sub);

  // Veio de um clique no evento do calendário: abre direto aquela reunião, em
  // vez de largar a pessoa na lista para procurar de novo o que ela já achou.
  if (ts.pendenteRelatorio) {
    const id = ts.pendenteRelatorio;
    ts.pendenteRelatorio = null;
    onTabChange("reports");
    ts.openSavedReport(id);
    return;
  }

  if (ts.pendente) {
    const pedida = ts.pendente;
    ts.pendente = null;
    const alvo = ts.meetings.find(m => m.joinUrl && m.joinUrl === pedida.joinUrl) || pedida;
    selectMeeting(alvo);
  }
});

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
  return text.replace(new RegExp(`(${q})`, 'gi'), '<mark class="bg-data-warn/10  rounded px-0.5">$1</mark>');
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
/* Era um balao proprio no canto - mesmo canto, mesma duracao e mesmo par
   verde/vermelho do toast do app, mas com fila propria: a segunda mensagem
   apagava a primeira antes do tempo. */
function showToast(message, type = 'success') {
  if (type === 'success') toast.success(message);
  else toast.error(message);
}
</script>

<style scoped>
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
