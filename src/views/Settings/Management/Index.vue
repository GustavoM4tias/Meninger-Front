<template>
  <div class="h-full py-6 md:py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-6 md:mb-8">
        <div class="flex items-center">
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Cargos, Departamentos, Categorias e Alçadas
          </h1>
          <Favorite class="ml-3" :router="'/settings/management'" :section="'Cargos'" />
        </div>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Configure departamentos, categorias, cargos e as cidades disponíveis para cadastro e gestão dos usuários.
        </p>
      </div>

      <!-- Tabs -->
      <div class="flex flex-wrap gap-3 md:gap-4 mb-6" role="tablist" aria-label="Tipo de configuração">
        <button v-for="tab in tabs" :key="tab.value" @click="activeTab = tab.value"
          :aria-pressed="activeTab === tab.value" role="tab" :class="[
            'inline-flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl font-semibold transition-all duration-300',
            'border dark:border-gray-700 shadow-sm hover:shadow',
            activeTab === tab.value
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent scale-[1.02]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          ]">
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- FAB -->
      <div class="fixed bottom-6 right-6 z-30">
        <button @click="openModal(null)"
          class="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full w-14 h-14 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
          :title="fabTitle">
          <i class="fas fa-plus text-xl group-hover:rotate-90 transition-transform duration-300"></i>
        </button>
      </div>

      <!--Erro -->
      <div v-if="store.error" class="mb-4 text-sm text-red-500 dark:text-red-400">
        {{ store.error }}
      </div>

      <!-- DEPARTAMENTOS -->
      <div v-if="activeTab === 'departments'">
        <div v-if="!store.departments.length" class="px-1 py-10 text-gray-500 dark:text-gray-400 text-sm">
          Nenhum departamento cadastrado.
        </div>

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          <article v-for="d in store.departments" :key="d.id"
            class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <div
              class="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {{ d.name }}
                </h2>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <i class="fas fa-hashtag mr-1.5"></i>
                    {{ d.code }}
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full text-[11px]" :class="d.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  ">
                  {{ d.active ? 'Ativo' : 'Inativo' }}
                </span>
                <div class="flex items-center gap-2">
                  <button @click="openModal(d)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="fas fa-pen mr-1"></i>
                    Editar
                  </button>
                  <button v-if="d.active" @click="deactivateItem(d)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                    <i class="fas fa-ban mr-1"></i>
                    Desativar
                  </button>
                </div>
              </div>
            </div>

            <div class="p-4 md:p-5 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <span class="font-medium">Descrição:</span>
                <span class="ml-1">
                  {{ d.description || '—' }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- CATEGORIAS -->
      <div v-else-if="activeTab === 'categories'">
        <div v-if="!store.departmentCategories.length" class="px-1 py-10 text-gray-500 dark:text-gray-400 text-sm">
          Nenhuma categoria cadastrada.
        </div>

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          <article v-for="c in store.departmentCategories" :key="c.id"
            class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <div
              class="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {{ c.name }}
                </h2>

                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <i class="fas fa-hashtag mr-1.5"></i>
                    {{ c.code }}
                  </span>

                  <!-- Departamento da categoria -->
                  <span v-if="c.department || c.department_id"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    <i class="fas fa-sitemap mr-1.5"></i>
                    {{ c.department?.name || departmentNameById(c.department_id) || 'Sem departamento' }}
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full text-[11px]" :class="c.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  ">
                  {{ c.active ? 'Ativo' : 'Inativo' }}
                </span>
                <div class="flex items-center gap-2">
                  <button @click="openModal(c)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="fas fa-pen mr-1"></i>
                    Editar
                  </button>
                  <button v-if="c.active" @click="deactivateItem(c)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                    <i class="fas fa-ban mr-1"></i>
                    Desativar
                  </button>
                </div>
              </div>
            </div>

            <div class="p-4 md:p-5 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <span class="font-medium">Descrição:</span>
                <span class="ml-1">
                  {{ c.description || '—' }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- CARGOS -->
      <div v-else-if="activeTab === 'positions'">
        <div v-if="!store.positions.length" class="px-1 py-10 text-gray-500 dark:text-gray-400 text-sm">
          Nenhum cargo cadastrado.
        </div>

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          <article v-for="p in store.positions" :key="p.id"
            class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <div
              class="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {{ p.name }}
                </h2>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <i class="fas fa-hashtag mr-1.5"></i>
                    {{ p.code }}
                  </span>

                  <!-- Departamento do cargo -->
                  <span v-if="p.department || p.department_id"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    <i class="fas fa-sitemap mr-1.5"></i>
                    {{ p.department?.name || departmentNameById(p.department_id) || 'Sem departamento' }}
                  </span>

                  <span v-if="p.is_internal"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="fas fa-building mr-1.5"></i>
                    Interno
                  </span>
                  <span v-if="p.is_partner"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <i class="fas fa-handshake mr-1.5"></i>
                    Parceiro
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full text-[11px]" :class="p.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  ">
                  {{ p.active ? 'Ativo' : 'Inativo' }}
                </span>
                <div class="flex items-center gap-2">
                  <button @click="openModal(p)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="fas fa-pen mr-1"></i>
                    Editar
                  </button>
                  <button v-if="p.active" @click="deactivateItem(p)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                    <i class="fas fa-ban mr-1"></i>
                    Desativar
                  </button>
                </div>
              </div>
            </div>

            <div class="p-4 md:p-5 space-y-3">
              <div class="text-sm text-gray-600 dark:text-gray-300">
                <span class="font-medium">Descrição:</span>
                <span class="ml-1">
                  {{ p.description || '—' }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- CIDADES -->
      <div v-else>
        <div v-if="!store.userCities.length" class="px-1 py-10 text-gray-500 dark:text-gray-400 text-sm">
          Nenhuma cidade cadastrado.
        </div>

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          <article v-for="c in store.userCities" :key="c.id"
            class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <div
              class="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {{ c.name }}
                </h2>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <i class="fas fa-map-marker-alt mr-1.5"></i>
                    {{ c.uf || 'UF não informada' }}
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full text-[11px]" :class="c.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  ">
                  {{ c.active ? 'Ativo' : 'Inativo' }}
                </span>
                <div class="flex items-center gap-2">
                  <button @click="openModal(c)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="fas fa-pen mr-1"></i>
                    Editar
                  </button>
                  <button v-if="c.active" @click="deactivateItem(c)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                    <i class="fas fa-ban mr-1"></i>
                    Desativar
                  </button>
                </div>
              </div>
            </div>

            <div class="p-4 md:p-5 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <span class="text-xs text-gray-400 dark:text-gray-500">
                ID interno: {{ c.id }}
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <transition name="fade">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-gray-900/60" @click="closeModal"></div>

        <div
          class="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          role="dialog" aria-modal="true">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                {{ modalTitle }}
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{
                  activeTab === 'positions'
                    ? 'Defina departamento, nome, código e tipo do cargo.'
                    : activeTab === 'departments'
                      ? 'Defina nome, código e descrição do departamento.'
                      : activeTab === 'categories'
                        ? 'Defina nome, código e descrição da categoria de departamento.'
                        : 'Defina nome e UF da cidade.'
                }}
              </p>
            </div>
            <button @click="closeModal"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-xl">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <!-- FORM CARGOS -->
            <div v-if="activeTab === 'positions'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Departamento
                </label>
                <select v-model="form.departmentId"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option disabled value="">Selecione um departamento</option>
                  <option v-for="d in store.departments.filter(d => d.active)" :key="d.id" :value="d.id">
                    {{ d.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do cargo
                </label>
                <input v-model="form.name" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Gestor Comercial" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código (único)
                </label>
                <input v-model="form.code" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="Ex: GESTOR_COMERCIAL" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea v-model="form.description" rows="3"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Resumo da função deste cargo (opcional)."></textarea>
              </div>

              <div class="flex items-center gap-4 text-sm">
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" v-model="form.is_internal" />
                  <span>Interno</span>
                </label>
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" v-model="form.is_partner" />
                  <span>Parceiro (Imobiliária / Corretor)</span>
                </label>
              </div>
            </div>

            <!-- FORM DEPARTAMENTOS -->
            <div v-else-if="activeTab === 'departments'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do departamento
                </label>
                <input v-model="form.name" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Marketing" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código (único)
                </label>
                <input v-model="form.code" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="Ex: MARKETING" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea v-model="form.description" rows="3"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Atividades ligadas à divulgação, branding etc."></textarea>
              </div>
            </div>

            <!-- FORM CATEGORIAS -->
            <div v-else-if="activeTab === 'categories'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Departamento
                </label>
                <select v-model="form.departmentId"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option disabled value="">Selecione um departamento</option>
                  <option v-for="d in store.departments.filter(d => d.active)" :key="d.id" :value="d.id">
                    {{ d.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da categoria
                </label>
                <input v-model="form.name" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Mídia, Eventos, Taxas..." />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código (único)
                </label>
                <input v-model="form.code" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="Ex: MIDIA, EVENTOS" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea v-model="form.description" rows="3"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Agrupamento de despesas de mídia, anúncios, etc."></textarea>
              </div>
            </div>

            <!-- FORM CIDADES -->
            <div v-else class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da cidade
                </label>
                <input v-model="form.name" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Marília" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  UF
                </label>
                <input v-model="form.uf" type="text" maxlength="2"
                  class="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="SP" />
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
              @click="closeModal">
              Cancelar
            </button>
            <button class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm" @click="saveItem">
              <i class="fas fa-save mr-2"></i>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Favorite from '@/components/config/Favorite.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useAdminMetaStore } from '@/stores/Settings/Admin/metaStore';
import { useToast } from 'vue-toastification';

const router = useRouter();
const authStore = useAuthStore();
const store = useAdminMetaStore();

const toast = (() => {
  try {
    return useToast();
  } catch {
    return { success: console.log, error: console.error };
  }
})();

const tabs = [
  { value: 'departments', label: 'Departamentos', icon: 'fas fa-sitemap' },
  { value: 'categories', label: 'Categorias', icon: 'fas fa-tags' },
  { value: 'positions', label: 'Cargos', icon: 'fas fa-id-badge' },
  { value: 'cities', label: 'Cidades', icon: 'fas fa-city' },
];

const activeTab = ref('departments');
const showModal = ref(false);
const editingItem = ref(null);

const form = ref({
  // comuns
  name: '',
  code: '',
  description: '',
  // cargo
  departmentId: '',
  is_internal: true,
  is_partner: false,
  // cidade
  uf: '',
});

const modalTitle = computed(() => {
  if (activeTab.value === 'positions') {
    return editingItem.value ? 'Editar Cargo' : 'Novo Cargo';
  }
  if (activeTab.value === 'departments') {
    return editingItem.value ? 'Editar Departamento' : 'Novo Departamento';
  }
  if (activeTab.value === 'categories') {
    return editingItem.value ? 'Editar Categoria' : 'Nova Categoria';
  }
  return editingItem.value ? 'Editar Cidade' : 'Nova Cidade';
});

const fabTitle = computed(() => {
  if (activeTab.value === 'positions') return 'Adicionar Cargo';
  if (activeTab.value === 'departments') return 'Adicionar Departamento';
  if (activeTab.value === 'categories') return 'Adicionar Categoria';
  return 'Adicionar Cidade';
});

const resetForm = () => {
  form.value = {
    name: '',
    code: '',
    description: '',
    departmentId: '',
    is_internal: true,
    is_partner: false,
    uf: '',
  };
};

const departmentNameById = (id) => {
  const dep = store.departments.find(d => d.id === id);
  return dep ? dep.name : null;
};

const openModal = (item) => {
  editingItem.value = item || null;

  if (!item) {
    resetForm();
  } else if (activeTab.value === 'positions') {
    form.value = {
      name: item.name,
      code: item.code,
      description: item.description || '',
      departmentId: item.department_id || item.department?.id || '',
      is_internal: !!item.is_internal,
      is_partner: !!item.is_partner,
      uf: '',
    };
  } else if (activeTab.value === 'departments') {
    form.value = {
      name: item.name,
      code: item.code,
      description: item.description || '',
      departmentId: '',
      is_internal: true,
      is_partner: false,
      uf: '',
    };
  } else if (activeTab.value === 'categories') {
    form.value = {
      name: item.name,
      code: item.code,
      description: item.description || '',
      departmentId: item.department_id || item.department?.id || '',
      is_internal: true,
      is_partner: false,
      uf: '',
    };
  } else {
    // cidades
    form.value = {
      name: item.name,
      uf: item.uf || '',
      code: '',
      description: '',
      departmentId: '',
      is_internal: true,
      is_partner: false,
    };
  }

  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveItem = async () => {
  try {
    let successMessage = '';

    if (activeTab.value === 'positions') {
      if (!form.value.departmentId) {
        toast.error('Selecione um departamento.');
        return;
      }
      if (!form.value.name.trim() || !form.value.code.trim()) {
        toast.error('Nome e código do cargo são obrigatórios.');
        return;
      }

      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim().toUpperCase(),
        description: form.value.description ? form.value.description.trim() : null,
        is_internal: !!form.value.is_internal,
        is_partner: !!form.value.is_partner,
        departmentId: Number(form.value.departmentId),
      };

      if (editingItem.value && editingItem.value.id) {
        await store.updatePosition(editingItem.value.id, payload);
        successMessage = 'Cargo atualizado com sucesso!';
      } else {
        await store.createPosition(payload);
        successMessage = 'Cargo criado com sucesso!';
      }
    } else if (activeTab.value === 'departments') {
      if (!form.value.name.trim() || !form.value.code.trim()) {
        toast.error('Nome e código do departamento são obrigatórios.');
        return;
      }

      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim().toUpperCase(),
        description: form.value.description ? form.value.description.trim() : null,
      };

      if (editingItem.value && editingItem.value.id) {
        await store.updateDepartment(editingItem.value.id, payload);
        successMessage = 'Departamento atualizado com sucesso!';
      } else {
        await store.createDepartment(payload);
        successMessage = 'Departamento criado com sucesso!';
      }
    } else if (activeTab.value === 'categories') {
      if (!form.value.departmentId) {
        toast.error('Selecione um departamento para a categoria.');
        return;
      }
      if (!form.value.name.trim() || !form.value.code.trim()) {
        toast.error('Nome e código da categoria são obrigatórios.');
        return;
      }

      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim().toUpperCase(),
        description: form.value.description ? form.value.description.trim() : null,
        departmentId: Number(form.value.departmentId),
      };

      if (editingItem.value && editingItem.value.id) {
        await store.updateDepartmentCategory(editingItem.value.id, payload);
        successMessage = 'Categoria atualizada com sucesso!';
      } else {
        await store.createDepartmentCategory(payload);
        successMessage = 'Categoria criada com sucesso!';
      }
    } else {
      // Cidades
      if (!form.value.name.trim()) {
        toast.error('Nome da cidade é obrigatório.');
        return;
      }

      const payload = {
        name: form.value.name.trim(),
        uf: form.value.uf ? form.value.uf.trim().toUpperCase() : null,
      };

      if (editingItem.value && editingItem.value.id) {
        await store.updateUserCity(editingItem.value.id, payload);
        successMessage = 'Cidade atualizada com sucesso!';
      } else {
        await store.createUserCity(payload);
        successMessage = 'Cidade criada com sucesso!';
      }
    }

    toast.success(successMessage);
    closeModal();
  } catch (e) {
    toast.error(e.message || 'Erro ao salvar dados.');
  }
};

const deactivateItem = async (item) => {
  const label =
    activeTab.value === 'positions'
      ? `cargo "${item.name}"`
      : activeTab.value === 'departments'
        ? `departamento "${item.name}"`
        : activeTab.value === 'categories'
          ? `categoria "${item.name}"`
          : `cidade "${item.name}"`;

  if (!confirm(`Desativar ${label}?`)) {
    return;
  }

  try {
    if (activeTab.value === 'positions') {
      await store.deactivatePosition(item.id);
    } else if (activeTab.value === 'departments') {
      await store.deactivateDepartment(item.id);
    } else if (activeTab.value === 'categories') {
      await store.deactivateDepartmentCategory(item.id);
    } else {
      await store.deactivateUserCity(item.id);
    }
  } catch (e) {
    toast.error(e.message || 'Erro ao desativar.');
  }
};

onMounted(async () => {
  if (!authStore.hasRole('admin')) {
    router.push('/');
    return;
  }

  await Promise.all([
    store.fetchDepartments(),
    store.fetchPositions(),
    store.fetchUserCities(),
    store.fetchDepartmentCategories(),
  ]);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
