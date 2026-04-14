<template>
  <div class="h-auto overflow-hidden relative">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Assinatura Digital</h1>
            <Favorite :router="'/tools/signature'" :section="'Assinatura Digital'" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Crie documentos com múltiplas assinaturas autenticadas por senha e reconhecimento facial.
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit">
        <button v-for="tab in tabs" :key="tab.key" type="button"
          class="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" :class="activeTab === tab.key
            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
          @click="activeTab = tab.key">
          <i :class="tab.icon" class="text-xs" />
          {{ tab.label }}
          <span v-if="tab.key === 'pending' && sigDocStore.pendingCount > 0"
            class="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
            {{ sigDocStore.pendingCount > 9 ? '9+' : sigDocStore.pendingCount }}
          </span>
        </button>
      </div>

      <!-- ═══════════════════════════════════════════════════════════
           TAB: CRIAR / ENVIAR
           ═══════════════════════════════════════════════════════════ -->
      <div v-show="activeTab === 'create'" class="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <!-- Formulário -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h2 class="font-semibold text-gray-900 dark:text-white">Novo documento</h2>

            <!-- Upload PDF -->
            <div class="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer" :class="[
              isCreateDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400',
              createFile ? 'bg-green-50 dark:bg-green-500/10 border-green-400' : ''
            ]" @dragover.prevent="isCreateDragging = true" @dragleave="isCreateDragging = false"
              @drop.prevent="onCreateFileDrop" @click="createFileInputRef?.click()">
              <input ref="createFileInputRef" type="file" accept="application/pdf" class="hidden"
                @change="onCreateFileChange" />
              <div class="p-6 text-center">
                <template v-if="createFile">
                  <i class="fas fa-file-pdf text-3xl text-green-500 mb-2" />
                  <p class="font-medium text-gray-900 dark:text-white text-sm truncate">{{ createFile.name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ formatSize(createFile.size) }}</p>
                  <button type="button" class="mt-2 text-xs text-red-400 hover:text-red-500"
                    @click.stop="clearCreateFile">
                    Remover
                  </button>
                </template>
                <template v-else>
                  <i class="fas fa-cloud-upload-alt text-3xl text-gray-300 dark:text-gray-600 mb-2" />
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Arraste um PDF ou <span class="text-blue-500">clique para selecionar</span>
                  </p>
                  <p class="text-xs text-gray-400 mt-0.5">Apenas arquivos .pdf</p>
                </template>
              </div>
            </div>

            <!-- Nome do documento -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Nome do documento
              </label>
              <input v-model="createForm.documentName" type="text" placeholder="Ex: Contrato de prestação de serviços"
                class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
            </div>

            <!-- Hash -->
            <div v-if="createForm.documentHash"
              class="text-[11px] text-gray-400 font-mono break-all bg-gray-50 dark:bg-white/5 rounded-lg p-2">
              SHA-256: {{ createForm.documentHash }}
            </div>

            <!-- Assinantes -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Assinantes
              </label>

              <MultiSelector v-model="selectedSignerIds" :options="userIdOptions"
                placeholder="Selecione um ou mais assinantes...">
                <template #button="{ selected }">
                  <template v-if="selected.length === 0">
                    Selecione um ou mais assinantes...
                  </template>
                  <template v-else-if="selected.length === 1">
                    <span class="flex items-center gap-2">
                      <img
                        :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(userById(selected[0])?.username ?? '')}&background=random&size=24`"
                        class="h-5 w-5 rounded-full shrink-0" />
                      {{ userById(selected[0])?.username ?? selected[0] }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="flex items-center gap-1.5">
                      <i class="fas fa-users text-blue-500 text-xs" />
                      {{ selected.length }} assinantes selecionados
                    </span>
                  </template>
                </template>

                <template #option="{ option }">
                  <div class="flex items-center gap-2.5 flex-1 min-w-0" @click.prevent="toggleSignerId(option)">
                    <img
                      :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(userById(option)?.username ?? '')}&background=random&size=32`"
                      class="h-7 w-7 rounded-full shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
                        {{ userById(option)?.username ?? option }}
                        <span v-if="isCurrentUser(option)"
                          class="ml-2 inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px]">
                          Eu
                        </span>
                      </p>
                      <p class="text-xs text-gray-400 truncate leading-tight">
                        {{ userById(option)?.position ?? '' }}
                      </p>
                    </div>
                    <i v-if="userById(option) && !userById(option).face_enabled"
                      class="fas fa-exclamation-triangle text-amber-400 text-xs shrink-0"
                      title="Sem facial cadastrado" />
                  </div>
                </template>
              </MultiSelector>

              <!-- Chips dos selecionados -->
              <div v-if="selectedSignerIds.length" class="flex flex-wrap gap-1.5 mt-1">
                <span v-for="uid in selectedSignerIds" :key="uid"
                  class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 pl-1.5 pr-2 py-0.5 text-xs text-blue-800 dark:text-blue-200">
                  <img
                    :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(userById(uid)?.username ?? '')}&background=random&size=20`"
                    class="h-4 w-4 rounded-full shrink-0" />
                  {{ userById(uid)?.username ?? uid }}
                  <i v-if="userById(uid) && !userById(uid).face_enabled"
                    class="fas fa-exclamation-triangle text-amber-400 text-[9px]" title="Sem facial" />
                  <button type="button" class="text-blue-400 hover:text-blue-600 transition ml-0.5"
                    @click="removeSignerUser(uid)">
                    <i class="fas fa-times text-[9px]" />
                  </button>
                </span>
              </div>

              <p v-if="selectedSignerIds.length" class="text-[11px] text-amber-600 dark:text-amber-400">
                <i class="fas fa-info-circle mr-1" />
                Todos os assinantes precisam ter reconhecimento facial cadastrado.
              </p>
            </div>

            <!-- Erro / Sucesso -->
            <div v-if="createError"
              class="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
              {{ createError }}
            </div>
            <div v-if="createSuccess"
              class="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400 flex gap-2">
              <i class="fas fa-check-circle mt-0.5 shrink-0" />
              {{ createSuccess }}
            </div>

            <!-- Submit -->
            <button type="button"
              class="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="!createFile || !createForm.documentName || !selectedSignerIds.length || createLoading"
              @click="submitCreateDocument">
              <template v-if="createLoading">
                <i class="fas fa-circle-notch fa-spin" />
                Enviando...
              </template>
              <template v-else>
                <i class="fas fa-paper-plane" />
                Criar e enviar para {{ selectedSignerIds.length || 0 }} assinante(s)
              </template>
            </button>
          </div>
        </div>

        <!-- Documentos criados por mim -->
        <div class="lg:col-span-3 space-y-4">
          <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-gray-900 dark:text-white">Documentos criados por mim</h2>
              <button type="button" class="text-xs text-blue-500 hover:text-blue-600"
                @click="sigDocStore.fetchMyDocuments()">
                <i class="fas fa-rotate-right mr-1" />Atualizar
              </button>
            </div>

            <div v-if="sigDocStore.loading && !sigDocStore.myDocuments.length" class="py-8 text-center text-gray-400">
              <i class="fas fa-circle-notch fa-spin text-2xl mb-2" />
              <p class="text-sm">Carregando...</p>
            </div>

            <div v-else-if="!sigDocStore.myDocuments.length" class="py-8 text-center text-gray-400">
              <i class="fas fa-folder-open text-3xl mb-2 opacity-30" />
              <p class="text-sm">Nenhum documento criado ainda.</p>
            </div>

            <div v-else class="space-y-2">
              <div v-for="doc in sigDocStore.myDocuments" :key="doc.id"
                class="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-3 hover:bg-gray-100 dark:hover:bg-white/10 transition">

                <div class="flex items-start gap-3">
                  <i class="fas fa-file-pdf text-gray-400 text-sm shrink-0 mt-0.5" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ doc.document_name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ fmtDate(doc.createdAt) }}</p>

                    <!-- Status + Progress -->
                    <div class="mt-2 space-y-1">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-gray-400">
                          {{ doc.signed_signers_count ?? 0 }}/{{ doc.required_signers_count ?? doc.signers?.length ?? 0
                          }}
                          assinatura(s)
                        </span>
                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                          :class="docStatusClass(doc.status)">
                          {{ docStatusLabel(doc.status) }}
                        </span>
                      </div>
                      <div class="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                        <div class="h-full rounded-full transition-all"
                          :class="doc.status === 'SIGNED' ? 'bg-green-500' : ['CANCELLED', 'REJECTED'].includes(doc.status) ? 'bg-red-400' : 'bg-blue-500'"
                          :style="{ width: `${progressPct(doc)}%` }" />
                      </div>
                    </div>


                    <div class="flex w-full justify-between">

                      <!-- Avatares dos assinantes -->
                      <div v-if="doc.signers?.length" class="flex items-center gap-1 mt-2 flex-wrap">
                        <div v-for="signer in doc.signers" :key="signer.id" class="relative"
                          :title="`${signer.signer?.username ?? 'Assinante'} — ${signerStatusLabel(signer.status)}`">
                          <img
                            :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(signer.signer?.username ?? '')}&background=random&size=28`"
                            class="h-7 w-7 rounded-full border-2" :class="signerAvatarBorder(signer.status)" />
                          <span
                            class="absolute -bottom-0.5 -right-0.5 text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-gray-900"
                            :class="signerDotClass(signer.status)">
                            <i :class="signerDotIcon(signer.status)" />
                          </span>
                        </div>
                      </div>

                      <!-- Ações -->
                      <div class="flex items-center mt-2 pl-6">
                        <div v-if="doc.original_document_url || doc.final_document_url" class="relative group">
                          <!-- BOTÃO -->
                          <button type="button"
                            class="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                            Ações
                            <i class="fas fa-chevron-down text-[9px]" />
                          </button>

                          <!-- ÁREA DE HOVER ESTENDIDA -->
                          <div class="absolute left-0 top-full w-full h-2 bg-transparent"></div>

                          <!-- DROPDOWN -->
                          <div
                            class="absolute right-0 top-full z-20 min-w-[140px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 shadow-lg opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
                            <div class="py-1">

                              <a v-if="doc.original_document_url" :href="doc.original_document_url" target="_blank"
                                rel="noopener"
                                class="flex items-center gap-3 px-4 py-2.5 text-xs text-blue-500 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                <i class="fas fa-eye text-[11px]" />
                                Ver original
                              </a>

                              <a v-if="doc.final_document_url" :href="doc.final_document_url" target="_blank"
                                rel="noopener"
                                class="flex items-center gap-3 px-4 py-2.5 text-xs text-green-600 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                <i class="fas fa-file-signature text-[11px]" />
                                Ver assinado
                              </a>

                              <div class="border-t border-gray-100 dark:border-white/10 my-1"></div>

                              <button v-if="doc.original_document_url" type="button"
                                class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5 transition"
                                @click="downloadDoc(doc.original_document_url, `${doc.document_name}-original`)">
                                <i class="fas fa-download text-[11px]" />
                                Baixar original
                              </button>

                              <button v-if="doc.final_document_url" type="button"
                                class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-green-600 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                                @click="downloadDoc(doc.final_document_url, `${doc.document_name}-assinado`)">
                                <i class="fas fa-download text-[11px]" />
                                Baixar assinado
                              </button>
                            </div>
                          </div>
                        </div>

                        <!-- EXCLUIR -->
                        <button v-if="canDeleteDoc(doc)" type="button"
                          class="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition ml-auto"
                          :disabled="deletingDocIds.has(doc.id)" @click="deleteDocument(doc)">
                          <i v-if="deletingDocIds.has(doc.id)" class="fas fa-circle-notch fa-spin text-[10px]" />
                          <i v-else class="fas fa-trash text-[10px]" />
                          Excluir
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════
           TAB: PARA ASSINAR
           ═══════════════════════════════════════════════════════════ -->
      <div v-show="activeTab === 'pending'">
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">Documentos aguardando minha assinatura</h2>
              <p class="text-xs text-gray-400 mt-0.5">
                Solicitações recebidas de outros usuários. Assine ou recuse cada uma.
              </p>
            </div>
            <button type="button" class="text-xs text-blue-500 hover:text-blue-600" @click="refreshPending">
              <i class="fas fa-rotate-right mr-1" />Atualizar
            </button>
          </div>

          <div v-if="sigDocStore.loading && !sigDocStore.mySigningItems.length" class="py-12 text-center text-gray-400">
            <i class="fas fa-circle-notch fa-spin text-2xl mb-2" />
            <p class="text-sm">Carregando...</p>
          </div>

          <div v-else-if="!pendingSigningItems.length" class="py-12 text-center text-gray-400">
            <i class="fas fa-check-circle text-3xl mb-2 text-green-400 opacity-60" />
            <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Tudo em dia!</p>
            <p class="text-xs mt-1">Nenhum documento aguardando sua assinatura.</p>
          </div>

          <div v-else class="space-y-3">
            <div v-for="item in pendingSigningItems" :key="item.id"
              class="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 hover:border-blue-300 dark:hover:border-blue-500/40 transition">

              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
                <i class="fas fa-file-signature text-amber-500" />
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ item.document?.document_name ?? 'Documento' }}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">
                  <span>Criado por: </span>
                  <span class="font-medium text-gray-600 dark:text-gray-300">
                    {{ item.document?.creator?.username ?? 'Desconhecido' }}
                  </span>
                  <span class="mx-1.5">·</span>
                  <span>{{ fmtDate(item.created_at) }}</span>
                </p>

                <!-- Progress bar do documento -->
                <div v-if="item.document" class="mt-2 space-y-1">
                  <span class="text-[11px] text-gray-400">
                    {{ item.document.signed_signers_count ?? 0 }}/{{ item.document.required_signers_count ??
                      item.document.signers?.length ?? 0 }} assinatura(s) concluídas
                  </span>
                  <div class="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div class="h-full rounded-full bg-blue-500 transition-all"
                      :style="{ width: `${progressPct(item.document)}%` }" />
                  </div>
                </div>

                <!-- Ver documento original -->
                <a v-if="item.document?.original_document_url" :href="item.document.original_document_url"
                  target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1.5 transition">
                  <i class="fas fa-eye text-[10px]" />Ver documento
                </a>

                <!-- Erro de rejeição -->
                <p v-if="rejectErrors[item.id]" class="text-xs text-red-500 mt-1">
                  <i class="fas fa-exclamation-circle mr-1" />{{ rejectErrors[item.id] }}
                </p>
              </div>

              <!-- Botões de ação -->
              <div class="flex flex-col gap-2 shrink-0">
                <button type="button"
                  class="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="rejectingIds.has(item.id)" @click="rejectSignerItem(item)">
                  <i v-if="rejectingIds.has(item.id)" class="fas fa-circle-notch fa-spin mr-1" />
                  <i v-else class="fas fa-times mr-1" />
                  {{ rejectingIds.has(item.id) ? 'Recusando...' : 'Recusar' }}
                </button>

                <button type="button"
                  class="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition"
                  @click="openSignModal(item)">
                  <i class="fas fa-pen-nib mr-1" />Assinar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════
           TAB: HISTÓRICO
           ═══════════════════════════════════════════════════════════ -->
      <div v-show="activeTab === 'history'">
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">Meu histórico de assinaturas</h2>
              <p class="text-xs text-gray-400 mt-0.5">
                Documentos que já assinei ou que foram cancelados/recusados.
              </p>
            </div>
            <button type="button" class="text-xs text-blue-500 hover:text-blue-600"
              @click="sigDocStore.fetchMySigningItems()">
              <i class="fas fa-rotate-right mr-1" />Atualizar
            </button>
          </div>

          <div v-if="sigDocStore.loading && !sigDocStore.mySigningItems.length" class="py-8 text-center text-gray-400">
            <i class="fas fa-circle-notch fa-spin text-2xl mb-2" />
            <p class="text-sm">Carregando...</p>
          </div>

          <div v-else-if="!historySigningItems.length" class="py-8 text-center text-gray-400">
            <i class="fas fa-history text-3xl mb-2 opacity-30" />
            <p class="text-sm">Nenhuma assinatura no histórico ainda.</p>
          </div>

          <div v-else class="space-y-2">
            <div v-for="item in historySigningItems" :key="item.id"
              class="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-3 hover:bg-gray-100 dark:hover:bg-white/10 transition">
              <div class="flex items-start gap-3">
                <i class="fas fa-file-pdf text-gray-400 text-sm shrink-0 mt-0.5" />

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ item.document?.document_name ?? 'Documento' }}
                      </p>

                      <p class="text-xs text-gray-400 mt-0.5">
                        <span>Criado por: {{ item.document?.creator?.username ?? '–' }}</span>
                        <span class="mx-1.5">·</span>
                        <span>{{ fmtDate(item.signed_at || item.created_at) }}</span>
                      </p>
                    </div>

                    <span v-if="item.document?.final_document_url"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 shrink-0">
                      PDF assinado disponível
                    </span>
                  </div>

                  <!-- Meu status de assinante + status do documento -->
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                      :class="signerStatusClass(item.status)">
                      {{ signerStatusLabel(item.status) }}
                    </span>

                    <span v-if="item.document"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                      :class="docStatusClass(item.document.status)">
                      Doc: {{ docStatusLabel(item.document.status) }}
                    </span>
                  </div>

                  <div class="flex w-full justify-between">

                    <!-- Código de verificação individual -->
                    <div v-if="item.verification_code && item.status === 'SIGNED'"
                      class="mt-1.5 text-[11px] my-auto font-mono text-gray-400 bg-gray-50 dark:bg-white/5 rounded px-2 py-1 inline-block">
                      Cód. individual: {{ item.verification_code }}
                    </div>

                    <div v-else
                      class="mt-1.5 text-[11px] my-auto font-mono text-gray-400 bg-gray-50 dark:bg-white/5 rounded px-2 py-1 inline-block">
                      Sem validade</div>

                    <!-- Ações -->
                    <div class="flex items-center -mt-1">
                      <div v-if="item.document?.original_document_url || item.document?.final_document_url"
                        class="relative group">
                        <!-- BOTÃO -->
                        <button type="button"
                          class="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                          Ações
                          <i class="fas fa-chevron-down text-[9px]" />
                        </button>

                        <!-- ÁREA DE HOVER ESTENDIDA -->
                        <div class="absolute left-0 top-full w-full h-2 bg-transparent"></div>

                        <!-- DROPDOWN -->
                        <div
                          class="absolute right-0 top-full z-20 min-w-[140px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 shadow-lg opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
                          <div class="py-1">

                            <a v-if="item.document?.original_document_url" :href="item.document.original_document_url"
                              target="_blank" rel="noopener"
                              class="flex items-center gap-3 px-4 py-2.5 text-xs text-blue-500 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <i class="fas fa-eye text-[11px]" />
                              Ver original
                            </a>

                            <a v-if="item.document?.final_document_url" :href="item.document.final_document_url"
                              target="_blank" rel="noopener"
                              class="flex items-center gap-3 px-4 py-2.5 text-xs text-green-600 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <i class="fas fa-file-signature text-[11px]" />
                              Ver assinado
                            </a>

                            <div class="border-t border-gray-100 dark:border-white/10 my-1"></div>

                            <button v-if="item.document?.original_document_url" type="button"
                              class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5 transition"
                              @click="downloadDoc(item.document.original_document_url, `${item.document.document_name}-original`)">
                              <i class="fas fa-download text-[11px]" />
                              Baixar original
                            </button>

                            <button v-if="item.document?.final_document_url" type="button"
                              class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-green-600 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                              @click="downloadDoc(item.document.final_document_url, `${item.document.document_name}-assinado`)">
                              <i class="fas fa-download text-[11px]" />
                              Baixar assinado
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal de assinatura (novo fluxo multi-sig) -->
    <SignatureModal v-model="showSignModal" :signer-item="activeSignerItem" @signed="onSigned" @cancel="onSignCancel" />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useSignatureDocumentStore } from '@/stores/Signature/signatureDocumentStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { uploadSignatureDocApi } from '@/utils/Signature/signatureDocumentApi';
import SignatureModal from '@/components/Signature/SignatureModal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Favorite from '@/components/config/Favorite.vue';

// ── Stores ───────────────────────────────────────────────────────────────────
const sigDocStore = useSignatureDocumentStore();
const authStore = useAuthStore();

// ── Tabs ─────────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'create', label: 'Criar / Enviar', icon: 'fas fa-paper-plane' },
  { key: 'pending', label: 'Para assinar', icon: 'fas fa-pen-nib' },
  { key: 'history', label: 'Histórico', icon: 'fas fa-history' },
];
const activeTab = ref('create');

// ── Utilitários gerais ───────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function computeHash(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function downloadDoc(url, name) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name ?? 'documento'}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, '_blank');
  }
}

function progressPct(doc) {
  const total = doc?.required_signers_count ?? doc?.signers?.length ?? 1;
  const signed = doc?.signed_signers_count ?? 0;
  return total > 0 ? Math.round((signed / total) * 100) : 0;
}

// ── Status labels / classes ──────────────────────────────────────────────────
const DOC_STATUS = {
  DRAFT: { label: 'Rascunho', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
  PENDING: { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  PARTIALLY_SIGNED: { label: 'Parcial', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  SIGNED: { label: 'Assinado', cls: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
  REJECTED: { label: 'Recusado', cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
  EXPIRED: { label: 'Expirado', cls: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400' },
};

const SIGNER_STATUS = {
  REQUESTED: { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  PENDING: { label: 'Iniciado', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  SIGNED: { label: 'Assinado', cls: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
  REJECTED: { label: 'Recusado', cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
  EXPIRED: { label: 'Expirado', cls: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400' },
};

function docStatusLabel(s) { return DOC_STATUS[s]?.label ?? s ?? '–'; }
function docStatusClass(s) { return DOC_STATUS[s]?.cls ?? 'bg-gray-100 text-gray-500'; }
function signerStatusLabel(s) { return SIGNER_STATUS[s]?.label ?? s ?? '–'; }
function signerStatusClass(s) { return SIGNER_STATUS[s]?.cls ?? 'bg-gray-100 text-gray-500'; }

// ── Signer avatar helpers ────────────────────────────────────────────────────
function signerAvatarBorder(status) {
  const map = {
    SIGNED: 'border-green-400', REJECTED: 'border-rose-400',
    CANCELLED: 'border-red-400', PENDING: 'border-blue-400',
  };
  return map[status] ?? 'border-gray-300 dark:border-gray-600';
}

function signerDotClass(status) {
  const map = {
    SIGNED: 'bg-green-400 text-white', REJECTED: 'bg-rose-400 text-white',
    CANCELLED: 'bg-red-400 text-white', PENDING: 'bg-blue-400 text-white',
  };
  return map[status] ?? 'bg-amber-400 text-white';
}

function signerDotIcon(status) {
  const map = {
    SIGNED: 'fas fa-check text-[6px]', REJECTED: 'fas fa-times text-[6px]',
    CANCELLED: 'fas fa-ban text-[6px]', PENDING: 'fas fa-hourglass-half text-[6px]',
  };
  return map[status] ?? 'fas fa-clock text-[6px]';
}

// ── Usuários ─────────────────────────────────────────────────────────────────
const currentUserId = computed(() => String(authStore.user?.id ?? ''));

const userIdOptions = computed(() =>
  (authStore.users || [])
    .filter(u => u.status === true || u.status === 1)
    .map(u => String(u.id))
);

const userMap = computed(() => {
  const map = {};
  for (const u of authStore.users || []) map[String(u.id)] = u;
  return map;
});

function userById(id) { return userMap.value[String(id)] ?? null; }
function isCurrentUser(id) { return String(id) === currentUserId.value; }

function removeSignerUser(id) {
  selectedSignerIds.value = selectedSignerIds.value.filter(v => v !== id);
}

function toggleSignerId(id) {
  const idx = selectedSignerIds.value.indexOf(id);
  selectedSignerIds.value = idx === -1
    ? [...selectedSignerIds.value, id]
    : selectedSignerIds.value.filter(v => v !== id);
}

// ── Criar documento ──────────────────────────────────────────────────────────
const createFileInputRef = ref(null);
const createFile = ref(null);
const isCreateDragging = ref(false);
const createLoading = ref(false);
const createError = ref(null);
const createSuccess = ref(null);
const selectedSignerIds = ref([]);

const createForm = ref({ documentName: '', documentHash: '' });

async function handleCreateFileSelected(file) {
  if (!file || file.type !== 'application/pdf') {
    createError.value = 'Apenas arquivos PDF são aceitos.';
    return;
  }
  createError.value = null;
  createFile.value = file;
  createForm.value.documentName = file.name.replace(/\.pdf$/i, '');
  createForm.value.documentHash = await computeHash(file);
}

function onCreateFileChange(e) { handleCreateFileSelected(e.target.files[0]); }
function onCreateFileDrop(e) { isCreateDragging.value = false; handleCreateFileSelected(e.dataTransfer.files[0]); }

function clearCreateFile() {
  createFile.value = null;
  createForm.value.documentHash = '';
  if (createFileInputRef.value) createFileInputRef.value.value = '';
}

async function submitCreateDocument() {
  if (!createFile.value || !createForm.value.documentName || !selectedSignerIds.value.length) return;

  createLoading.value = true;
  createError.value = null;
  createSuccess.value = null;

  try {
    const uploadRes = await uploadSignatureDocApi(createFile.value);
    const documentUrl = uploadRes.data?.url ?? uploadRes.url ?? null;

    await sigDocStore.createDocument({
      document_name: createForm.value.documentName,
      document_type: 'PDF',
      document_url: documentUrl,
      document_hash: createForm.value.documentHash,
      metadata: {},
      signer_ids: selectedSignerIds.value.map(uid => Number(uid)),
    });

    createSuccess.value = `Documento criado e enviado para ${selectedSignerIds.value.length} assinante(s)!`;

    clearCreateFile();
    createForm.value.documentName = '';
    selectedSignerIds.value = [];

    await Promise.all([
      sigDocStore.fetchMyDocuments(),
      sigDocStore.fetchPendingCount(),
    ]);
  } catch (err) {
    createError.value = sigDocStore.error || err?.message || 'Erro ao criar documento.';
  } finally {
    createLoading.value = false;
  }
}

// ── Deletar documento (criado por mim) ───────────────────────────────────────
const deletingDocIds = ref(new Set());

function canDeleteDoc(doc) {
  return ['PENDING', 'DRAFT'].includes(doc.status);
}

async function deleteDocument(doc) {
  if (!confirm(`Excluir "${doc.document_name}"? Todas as assinaturas pendentes serão canceladas.`)) return;

  deletingDocIds.value = new Set([...deletingDocIds.value, doc.id]);
  try {
    await sigDocStore.deleteDocument(doc.id);
    await sigDocStore.fetchPendingCount();
  } catch (err) {
    alert(sigDocStore.error || err?.message || 'Erro ao excluir documento.');
  } finally {
    const next = new Set(deletingDocIds.value);
    next.delete(doc.id);
    deletingDocIds.value = next;
  }
}

// ── Signing items (itens que preciso assinar) ────────────────────────────────
const pendingSigningItems = computed(() =>
  sigDocStore.mySigningItems.filter(s => s.status === 'REQUESTED' || s.status === 'PENDING')
);

const historySigningItems = computed(() =>
  sigDocStore.mySigningItems.filter(s => !['REQUESTED', 'PENDING'].includes(s.status))
);

function refreshPending() {
  sigDocStore.fetchMySigningItems();
  sigDocStore.fetchPendingCount();
}

// ── Rejeitar ─────────────────────────────────────────────────────────────────
const rejectingIds = ref(new Set());
const rejectErrors = ref({});

async function rejectSignerItem(item) {
  if (!confirm(`Recusar a solicitação para "${item.document?.document_name ?? 'este documento'}"?`)) return;

  rejectingIds.value = new Set([...rejectingIds.value, item.id]);
  delete rejectErrors.value[item.id];

  try {
    await sigDocStore.rejectSigner(item.id, 'Recusado pelo assinante');
    await sigDocStore.fetchMySigningItems();
    await sigDocStore.fetchPendingCount();
  } catch (err) {
    rejectErrors.value = {
      ...rejectErrors.value,
      [item.id]: sigDocStore.error || err?.message || 'Erro ao recusar.',
    };
  } finally {
    const next = new Set(rejectingIds.value);
    next.delete(item.id);
    rejectingIds.value = next;
  }
}

// ── Modal de assinatura ──────────────────────────────────────────────────────
const showSignModal = ref(false);
const activeSignerItem = ref(null);

function openSignModal(item) {
  activeSignerItem.value = item;
  showSignModal.value = true;
}

async function onSigned() {
  showSignModal.value = false;
  activeSignerItem.value = null;

  await Promise.all([
    sigDocStore.fetchMyDocuments(),
    sigDocStore.fetchMySigningItems(),
    sigDocStore.fetchPendingCount(),
  ]);
}

function onSignCancel() {
  showSignModal.value = false;
  activeSignerItem.value = null;
}

// ── Inicialização ────────────────────────────────────────────────────────────
const loadTabData = async () => {
  // Aqui você decide se quer carregar TUDO ou apenas o que é relevante para a aba ativa
  await Promise.all([
    sigDocStore.fetchMyDocuments(),
    sigDocStore.fetchMySigningItems(),
    sigDocStore.fetchPendingCount(),
  ]);

  if (!authStore.users?.length) {
    await authStore.getAllUsers();
  }
};

// 2. Chame no onMounted original
onMounted(() => {
  loadTabData();
});

watch(activeTab, (newTab) => {
  loadTabData();
});
</script>
